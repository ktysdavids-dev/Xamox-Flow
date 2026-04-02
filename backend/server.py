from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import random
import string
import asyncio
import base64
import urllib.parse
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
import hashlib
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB (si falta MONGO_URL en .env, no romper el import: local por defecto)
_raw_mongo = (os.environ.get('MONGO_URL') or '').strip()
MONGO_URL_WAS_DEFAULTED = not _raw_mongo
mongo_url = _raw_mongo or 'mongodb://127.0.0.1:27017'
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'xamox_flow')]

# JWT Config
SECRET_KEY = os.environ.get('JWT_SECRET', 'xamox-flow-secret-key-2024-premium')
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Stripe / monetization
STRIPE_SECRET_KEY = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
STRIPE_WEBHOOK_SECRET = (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()
STRIPE_PRICE_ID = (os.environ.get("STRIPE_PRICE_ID") or "").strip()
STRIPE_PROMO_AMOUNT_EUR_CENTS = int((os.environ.get("STRIPE_PROMO_AMOUNT_EUR_CENTS") or "299").strip() or "299")
MARKETING_SITE_URL = (os.environ.get("MARKETING_SITE_URL") or "https://www.xamoxflow.com").rstrip("/")
PLAY_SITE_URL = (os.environ.get("PLAY_SITE_URL") or "https://play.xamoxflow.com").rstrip("/")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

app = FastAPI()

# Ensure uploads directory exists
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    avatar_color: str = "#FFD700"
    games_played: int = 0
    games_won: int = 0
    total_net_worth: int = 0
    achievements: List[str] = []
    friends: List[str] = []
    language: str = "es"
    music_enabled: bool = True
    sfx_enabled: bool = True
    created_at: str = ""

class SaveGameRequest(BaseModel):
    game_state: Dict[str, Any]
    slot_name: str = "Auto Save"

# ==================== GAME CONTENT ====================

PROFESSIONS = {
    "teacher": {
        "id": "teacher",
        "name": {"es": "Maestro", "en": "Teacher", "pt": "Professor", "fr": "Enseignant", "de": "Lehrer", "it": "Insegnante", "zh": "教师"},
        "difficulty": "medium",
        "salary": 3000,
        "expenses": 1800,
        "net_flow": 1200,
        "starting_cash": 400,
        "description": {"es": "Vida sencilla, salario modesto", "en": "Simple life, modest salary", "pt": "Vida simples, salário modesto", "fr": "Vie simple, salaire modeste", "de": "Einfaches Leben, bescheidenes Gehalt", "it": "Vita semplice, stipendio modesto", "zh": "简单生活，适中薪水"}
    },
    "engineer": {
        "id": "engineer",
        "name": {"es": "Ingeniero", "en": "Engineer", "pt": "Engenheiro", "fr": "Ingénieur", "de": "Ingenieur", "it": "Ingegnere", "zh": "工程师"},
        "difficulty": "easy",
        "salary": 5000,
        "expenses": 2800,
        "net_flow": 2200,
        "starting_cash": 1000,
        "description": {"es": "Buen salario, gastos moderados", "en": "Good salary, moderate expenses", "pt": "Bom salário, despesas moderadas", "fr": "Bon salaire, dépenses modérées", "de": "Gutes Gehalt, moderate Ausgaben", "it": "Buon stipendio, spese moderate", "zh": "良好薪水，适中开支"}
    },
    "doctor": {
        "id": "doctor",
        "name": {"es": "Doctor", "en": "Doctor", "pt": "Médico", "fr": "Médecin", "de": "Arzt", "it": "Dottore", "zh": "医生"},
        "difficulty": "hard",
        "salary": 13000,
        "expenses": 8300,
        "net_flow": 4700,
        "starting_cash": 2500,
        "description": {"es": "Alto salario, altos gastos", "en": "High salary, high expenses", "pt": "Alto salário, altas despesas", "fr": "Salaire élevé, dépenses élevées", "de": "Hohes Gehalt, hohe Ausgaben", "it": "Alto stipendio, alte spese", "zh": "高薪，高支出"}
    },
    "janitor": {
        "id": "janitor",
        "name": {"es": "Conserje", "en": "Janitor", "pt": "Zelador", "fr": "Concierge", "de": "Hausmeister", "it": "Custode", "zh": "管理员"},
        "difficulty": "expert",
        "salary": 1600,
        "expenses": 1000,
        "net_flow": 600,
        "starting_cash": 200,
        "description": {"es": "Salario bajo, gastos mínimos", "en": "Low salary, minimal expenses", "pt": "Baixo salário, despesas mínimas", "fr": "Bas salaire, dépenses minimales", "de": "Niedriges Gehalt, minimale Ausgaben", "it": "Basso stipendio, spese minime", "zh": "低薪，最低支出"}
    },
    "nurse": {
        "id": "nurse",
        "name": {"es": "Enfermera", "en": "Nurse", "pt": "Enfermeiro", "fr": "Infirmier", "de": "Krankenschwester", "it": "Infermiere", "zh": "护士"},
        "difficulty": "medium",
        "salary": 3800,
        "expenses": 2150,
        "net_flow": 1650,
        "starting_cash": 600,
        "description": {"es": "Equilibrio entre ingresos y gastos", "en": "Balance between income and expenses", "pt": "Equilíbrio entre receitas e despesas", "fr": "Équilibre entre revenus et dépenses", "de": "Gleichgewicht zwischen Einnahmen und Ausgaben", "it": "Equilibrio tra entrate e spese", "zh": "收支平衡"}
    },
    "lawyer": {
        "id": "lawyer",
        "name": {"es": "Abogado", "en": "Lawyer", "pt": "Advogado", "fr": "Avocat", "de": "Anwalt", "it": "Avvocato", "zh": "律师"},
        "difficulty": "hard",
        "salary": 9500,
        "expenses": 6100,
        "net_flow": 3400,
        "starting_cash": 1800,
        "description": {"es": "Profesional exitoso con deudas estudiantiles", "en": "Successful professional with student loans", "pt": "Profissional de sucesso com dívidas estudantis", "fr": "Professionnel à succès avec des prêts étudiants", "de": "Erfolgreicher Fachmann mit Studienkrediten", "it": "Professionista di successo con debiti studenteschi", "zh": "成功的专业人士，有学生贷款"}
    },
    "entrepreneur": {
        "id": "entrepreneur",
        "name": {"es": "Emprendedor", "en": "Entrepreneur", "pt": "Empreendedor", "fr": "Entrepreneur", "de": "Unternehmer", "it": "Imprenditore", "zh": "企业家"},
        "difficulty": "expert",
        "salary": 2000,
        "expenses": 1500,
        "net_flow": 500,
        "starting_cash": 5000,
        "description": {"es": "Bajo salario fijo, alto capital inicial", "en": "Low fixed salary, high starting capital", "pt": "Baixo salário fixo, alto capital inicial", "fr": "Bas salaire fixe, capital de départ élevé", "de": "Niedriges Festgehalt, hohes Startkapital", "it": "Basso stipendio fisso, alto capitale iniziale", "zh": "低固定薪水，高启动资金"}
    },
    "pilot": {
        "id": "pilot",
        "name": {"es": "Piloto", "en": "Pilot", "pt": "Piloto", "fr": "Pilote", "de": "Pilot", "it": "Pilota", "zh": "飞行员"},
        "difficulty": "medium",
        "salary": 7000,
        "expenses": 4500,
        "net_flow": 2500,
        "starting_cash": 1500,
        "description": {"es": "Buen salario con gastos de estilo de vida", "en": "Good salary with lifestyle expenses", "pt": "Bom salário com despesas de estilo de vida", "fr": "Bon salaire avec dépenses de style de vie", "de": "Gutes Gehalt mit Lifestyle-Ausgaben", "it": "Buon stipendio con spese di stile di vita", "zh": "良好薪水，生活方式支出"}
    }
}

# Board tile types
TILE_TYPES = ["payday", "investment", "event", "trivia", "real_estate", "market", "opportunity", "tax"]

BOARD_TILES = [
    {"id": 0, "type": "payday", "icon": "💰"},
    {"id": 1, "type": "investment", "icon": "📈"},
    {"id": 2, "type": "real_estate", "icon": "🏠"},
    {"id": 3, "type": "event", "icon": "⚡"},
    {"id": 4, "type": "real_estate", "icon": "🏠"},
    {"id": 5, "type": "trivia", "icon": "❓"},
    {"id": 6, "type": "market", "icon": "📊"},
    {"id": 7, "type": "event", "icon": "⚡"},
    {"id": 8, "type": "real_estate", "icon": "🏠"},
    {"id": 9, "type": "opportunity", "icon": "🌟"},
    {"id": 10, "type": "real_estate", "icon": "🏠"},
    {"id": 11, "type": "investment", "icon": "📈"},
    {"id": 12, "type": "tax", "icon": "🏛️"},
    {"id": 13, "type": "event", "icon": "⚡"},
    {"id": 14, "type": "trivia", "icon": "❓"},
    {"id": 15, "type": "real_estate", "icon": "🏠"},
    {"id": 16, "type": "event", "icon": "⚡"},
    {"id": 17, "type": "real_estate", "icon": "🏠"},
    {"id": 18, "type": "investment", "icon": "📈"},
    {"id": 19, "type": "market", "icon": "📊"},
    {"id": 20, "type": "event", "icon": "⚡"},
    {"id": 21, "type": "opportunity", "icon": "🌟"},
    {"id": 22, "type": "real_estate", "icon": "🏠"},
    {"id": 23, "type": "trivia", "icon": "❓"},
]

# Events
EVENTS = [
    {"id": "e1", "type": "positive", "title": {"es": "Bonus Laboral", "en": "Work Bonus", "pt": "Bônus de Trabalho", "fr": "Prime de Travail", "de": "Arbeitsbonus", "it": "Bonus Lavorativo", "zh": "工作奖金"}, "description": {"es": "Tu empresa te da un bonus por buen desempeño", "en": "Your company gives you a performance bonus", "pt": "Sua empresa lhe dá um bônus por bom desempenho", "fr": "Votre entreprise vous accorde un bonus de performance", "de": "Ihre Firma gibt Ihnen einen Leistungsbonus", "it": "La tua azienda ti dà un bonus per le prestazioni", "zh": "公司给你绩效奖金"}, "amount": 1500},
    {"id": "e2", "type": "negative", "title": {"es": "Reparación del Auto", "en": "Car Repair", "pt": "Reparo do Carro", "fr": "Réparation de Voiture", "de": "Autoreparatur", "it": "Riparazione Auto", "zh": "汽车维修"}, "description": {"es": "Tu auto necesita reparaciones urgentes", "en": "Your car needs urgent repairs", "pt": "Seu carro precisa de reparos urgentes", "fr": "Votre voiture a besoin de réparations urgentes", "de": "Ihr Auto braucht dringende Reparaturen", "it": "La tua auto ha bisogno di riparazioni urgenti", "zh": "你的车需要紧急维修"}, "amount": -800},
    {"id": "e3", "type": "positive", "title": {"es": "Herencia Sorpresa", "en": "Surprise Inheritance", "pt": "Herança Surpresa", "fr": "Héritage Surprise", "de": "Überraschungserbschaft", "it": "Eredità a Sorpresa", "zh": "意外遗产"}, "description": {"es": "Un pariente lejano te deja una herencia", "en": "A distant relative leaves you an inheritance", "pt": "Um parente distante lhe deixa uma herança", "fr": "Un parent éloigné vous laisse un héritage", "de": "Ein entfernter Verwandter hinterlässt Ihnen ein Erbe", "it": "Un parente lontano ti lascia un'eredità", "zh": "远亲留给你一笔遗产"}, "amount": 3000},
    {"id": "e4", "type": "negative", "title": {"es": "Emergencia Médica", "en": "Medical Emergency", "pt": "Emergência Médica", "fr": "Urgence Médicale", "de": "Medizinischer Notfall", "it": "Emergenza Medica", "zh": "医疗紧急情况"}, "description": {"es": "Una visita inesperada al hospital", "en": "An unexpected hospital visit", "pt": "Uma visita inesperada ao hospital", "fr": "Une visite imprévue à l'hôpital", "de": "Ein unerwarteter Krankenhausbesuch", "it": "Una visita inaspettata in ospedale", "zh": "意外住院"}, "amount": -2000},
    {"id": "e5", "type": "positive", "title": {"es": "Freelance Exitoso", "en": "Successful Freelance", "pt": "Freelance de Sucesso", "fr": "Freelance Réussi", "de": "Erfolgreicher Freelance", "it": "Freelance di Successo", "zh": "成功的自由职业"}, "description": {"es": "Completaste un proyecto freelance extra", "en": "You completed an extra freelance project", "pt": "Você completou um projeto freelance extra", "fr": "Vous avez terminé un projet freelance supplémentaire", "de": "Sie haben ein zusätzliches Freelance-Projekt abgeschlossen", "it": "Hai completato un progetto freelance extra", "zh": "你完成了一个额外的自由职业项目"}, "amount": 2000},
    {"id": "e6", "type": "negative", "title": {"es": "Multa de Tránsito", "en": "Traffic Fine", "pt": "Multa de Trânsito", "fr": "Amende de Circulation", "de": "Verkehrsstrafe", "it": "Multa Stradale", "zh": "交通罚款"}, "description": {"es": "Te pusieron una multa por exceso de velocidad", "en": "You got a speeding ticket", "pt": "Você recebeu uma multa por excesso de velocidade", "fr": "Vous avez reçu une amende pour excès de vitesse", "de": "Sie haben einen Strafzettel wegen Geschwindigkeitsüberschreitung erhalten", "it": "Hai ricevuto una multa per eccesso di velocità", "zh": "你因超速被罚款"}, "amount": -500},
    {"id": "e7", "type": "positive", "title": {"es": "Dividendos Recibidos", "en": "Dividends Received", "pt": "Dividendos Recebidos", "fr": "Dividendes Reçus", "de": "Dividenden Erhalten", "it": "Dividendi Ricevuti", "zh": "收到股息"}, "description": {"es": "Tus acciones pagaron dividendos este trimestre", "en": "Your stocks paid dividends this quarter", "pt": "Suas ações pagaram dividendos neste trimestre", "fr": "Vos actions ont versé des dividendes ce trimestre", "de": "Ihre Aktien haben in diesem Quartal Dividenden gezahlt", "it": "Le tue azioni hanno pagato dividendi questo trimestre", "zh": "你的股票在本季度支付了股息"}, "amount": 1200},
    {"id": "e8", "type": "negative", "title": {"es": "Impuesto Sorpresa", "en": "Surprise Tax", "pt": "Imposto Surpresa", "fr": "Taxe Surprise", "de": "Überraschungssteuer", "it": "Tassa a Sorpresa", "zh": "意外税收"}, "description": {"es": "El gobierno anuncia un impuesto adicional", "en": "The government announces an additional tax", "pt": "O governo anuncia um imposto adicional", "fr": "Le gouvernement annonce une taxe supplémentaire", "de": "Die Regierung kündigt eine zusätzliche Steuer an", "it": "Il governo annuncia una tassa aggiuntiva", "zh": "政府宣布额外税收"}, "amount": -1500},
    {"id": "e9", "type": "positive", "title": {"es": "Venta en Garage", "en": "Garage Sale", "pt": "Venda de Garagem", "fr": "Vide-Grenier", "de": "Flohmarktverkauf", "it": "Vendita in Garage", "zh": "车库甩卖"}, "description": {"es": "Vendiste cosas que ya no necesitabas", "en": "You sold things you no longer needed", "pt": "Você vendeu coisas que não precisava mais", "fr": "Vous avez vendu des choses dont vous n'aviez plus besoin", "de": "Sie haben Dinge verkauft, die Sie nicht mehr brauchten", "it": "Hai venduto cose che non ti servivano più", "zh": "你卖掉了不再需要的东西"}, "amount": 700},
    {"id": "e10", "type": "negative", "title": {"es": "Electrodoméstico Roto", "en": "Broken Appliance", "pt": "Eletrodoméstico Quebrado", "fr": "Appareil Cassé", "de": "Kaputtes Gerät", "it": "Elettrodomestico Rotto", "zh": "家电故障"}, "description": {"es": "Tu refrigerador dejó de funcionar", "en": "Your refrigerator stopped working", "pt": "Sua geladeira parou de funcionar", "fr": "Votre réfrigérateur a cessé de fonctionner", "de": "Ihr Kühlschrank funktioniert nicht mehr", "it": "Il tuo frigorifero ha smesso di funzionare", "zh": "你的冰箱坏了"}, "amount": -600},
    {"id": "e11", "type": "positive", "title": {"es": "Reembolso de Impuestos", "en": "Tax Refund", "pt": "Restituição de Impostos", "fr": "Remboursement d'Impôts", "de": "Steuerrückerstattung", "it": "Rimborso Fiscale", "zh": "退税"}, "description": {"es": "Recibiste tu reembolso de impuestos anual", "en": "You received your annual tax refund", "pt": "Você recebeu sua restituição anual de impostos", "fr": "Vous avez reçu votre remboursement d'impôts annuel", "de": "Sie haben Ihre jährliche Steuerrückerstattung erhalten", "it": "Hai ricevuto il tuo rimborso fiscale annuale", "zh": "你收到了年度退税"}, "amount": 2500},
    {"id": "e12", "type": "negative", "title": {"es": "Inundación en Casa", "en": "House Flood", "pt": "Inundação em Casa", "fr": "Inondation à la Maison", "de": "Hausüberschwemmung", "it": "Alluvione in Casa", "zh": "房屋水灾"}, "description": {"es": "Una tubería rota causó daños en tu casa", "en": "A broken pipe caused damage to your house", "pt": "Um cano quebrado causou danos à sua casa", "fr": "Un tuyau cassé a causé des dégâts dans votre maison", "de": "Ein gebrochenes Rohr verursachte Schäden an Ihrem Haus", "it": "Un tubo rotto ha causato danni alla tua casa", "zh": "水管破裂导致房屋受损"}, "amount": -1800},
]

# Trivia questions - 50 questions with difficulty levels (easy/medium/hard)
TRIVIA_QUESTIONS = [
    {'id': 'e1', 'difficulty': 'easy', 'question': {'es': '¿Que es un activo?', 'en': 'What is an asset?'}, 'options': {'es': ['Un gasto mensual', 'Una deuda bancaria', 'Algo que te genera dinero', 'Un impuesto'], 'en': ['A monthly expense', 'A bank debt', 'Something that generates money for you', 'A tax']}, 'correct': 2, 'reward': 400},
    {'id': 'e2', 'difficulty': 'easy', 'question': {'es': '¿Que es un pasivo?', 'en': 'What is a liability?'}, 'options': {'es': ['Una obligacion que te cuesta dinero', 'Un ingreso extra', 'Una inversion', 'Un ahorro'], 'en': ['An obligation that costs you money', 'Extra income', 'An investment', 'A saving']}, 'correct': 0, 'reward': 400},
    {'id': 'e3', 'difficulty': 'easy', 'question': {'es': '¿Que es el ahorro?', 'en': 'What is saving?'}, 'options': {'es': ['Gastar todo tu dinero', 'Pedir prestamos', 'Invertir en bolsa', 'Guardar parte de tus ingresos para el futuro'], 'en': ['Spending all your money', 'Taking loans', 'Investing in stocks', 'Setting aside part of your income for the future']}, 'correct': 3, 'reward': 400},
    {'id': 'e4', 'difficulty': 'easy', 'question': {'es': '¿Que es un presupuesto?', 'en': 'What is a budget?'}, 'options': {'es': ['Un plan para gestionar ingresos y gastos', 'Un tipo de inversion', 'Una deuda', 'Un impuesto'], 'en': ['A plan to manage income and expenses', 'A type of investment', 'A debt', 'A tax']}, 'correct': 0, 'reward': 400},
    {'id': 'e5', 'difficulty': 'easy', 'question': {'es': '¿Que es el interes?', 'en': 'What is interest?'}, 'options': {'es': ['Un regalo del banco', 'Un impuesto gubernamental', 'El costo de pedir dinero prestado o la ganancia por prestarlo', 'Una multa'], 'en': ['A gift from the bank', 'A government tax', 'The cost of borrowing money or the gain from lending it', 'A fine']}, 'correct': 2, 'reward': 400},
    {'id': 'e6', 'difficulty': 'easy', 'question': {'es': '¿Que es la inflacion?', 'en': 'What is inflation?'}, 'options': {'es': ['Cuando bajan los precios', 'Un tipo de inversion', 'Una reduccion de impuestos', 'Cuando los precios suben y el dinero pierde valor'], 'en': ['When prices go down', 'A type of investment', 'A tax reduction', 'When prices rise and money loses value']}, 'correct': 3, 'reward': 400},
    {'id': 'e7', 'difficulty': 'easy', 'question': {'es': '¿Que es un salario?', 'en': 'What is a salary?'}, 'options': {'es': ['Dinero que pagas al gobierno', 'El pago regular que recibes por tu trabajo', 'Un prestamo bancario', 'Una inversion'], 'en': ['Money you pay the government', 'The regular payment you receive for your work', 'A bank loan', 'An investment']}, 'correct': 1, 'reward': 400},
    {'id': 'e8', 'difficulty': 'easy', 'question': {'es': '¿Que es una deuda?', 'en': 'What is a debt?'}, 'options': {'es': ['Dinero que te deben', 'Una ganancia', 'Dinero que debes a alguien', 'Un activo'], 'en': ['Money owed to you', 'A profit', 'Money you owe to someone', 'An asset']}, 'correct': 2, 'reward': 400},
    {'id': 'e9', 'difficulty': 'easy', 'question': {'es': '¿Que es mejor para tu economia personal?', 'en': 'What is better for personal finances?'}, 'options': {'es': ['Gastar mas de lo que ganas', 'Gastar exactamente lo que ganas', 'Gastar menos de lo que ganas y ahorrar', 'No trabajar'], 'en': ['Spend more than you earn', 'Spend exactly what you earn', 'Spend less than you earn and save', 'Not working']}, 'correct': 2, 'reward': 400},
    {'id': 'e10', 'difficulty': 'easy', 'question': {'es': '¿Que es un fondo de emergencia?', 'en': 'What is an emergency fund?'}, 'options': {'es': ['Dinero para vacaciones', 'Un prestamo rapido', 'Dinero en la billetera', 'Ahorro para 3-6 meses de gastos imprevistos'], 'en': ['Money for vacations', 'A quick loan', 'Cash in your wallet', 'Savings for 3-6 months of unexpected expenses']}, 'correct': 3, 'reward': 400},
    {'id': 'e11', 'difficulty': 'easy', 'question': {'es': '¿Que es una cuenta de ahorro?', 'en': 'What is a savings account?'}, 'options': {'es': ['Una cuenta para depositar y ganar intereses', 'Una tarjeta de credito', 'Un prestamo', 'Una deuda'], 'en': ['An account to deposit money and earn interest', 'A credit card', 'A loan', 'A debt']}, 'correct': 0, 'reward': 400},
    {'id': 'e12', 'difficulty': 'easy', 'question': {'es': '¿Que son los gastos fijos?', 'en': 'What are fixed expenses?'}, 'options': {'es': ['Gastos que cambian cada mes', 'Gastos opcionales de lujo', 'Inversiones mensuales', 'Gastos que se repiten cada mes con el mismo monto'], 'en': ['Expenses that change monthly', 'Optional luxury expenses', 'Monthly investments', 'Expenses that repeat monthly with the same amount']}, 'correct': 3, 'reward': 400},
    {'id': 'e13', 'difficulty': 'easy', 'question': {'es': '¿Que es el flujo de efectivo?', 'en': 'What is cash flow?'}, 'options': {'es': ['La diferencia entre ingresos y gastos', 'El dinero en tu banco', 'Tu salario mensual', 'El valor de tus propiedades'], 'en': ['The difference between income and expenses', 'Money in your bank', 'Your monthly salary', 'The value of your properties']}, 'correct': 0, 'reward': 400},
    {'id': 'e14', 'difficulty': 'easy', 'question': {'es': '¿Que es mejor para generar ingresos pasivos?', 'en': 'What is best for generating passive income?'}, 'options': {'es': ['Trabajar horas extras', 'Guardar dinero bajo el colchon', 'Comprar propiedades para alquilar', 'Pedir prestamos'], 'en': ['Working overtime', 'Keeping money under the mattress', 'Buying rental properties', 'Taking loans']}, 'correct': 2, 'reward': 400},
    {'id': 'e15', 'difficulty': 'easy', 'question': {'es': '¿Que significa ROI?', 'en': 'What does ROI mean?'}, 'options': {'es': ['Riesgo Operativo Inicial', 'Registro de Operaciones', 'Retorno Sobre la Inversion', 'Resultado Operativo'], 'en': ['Risk Of Investment', 'Record Of Operations', 'Return On Investment', 'Operational Result']}, 'correct': 2, 'reward': 500},
    {'id': 'e16', 'difficulty': 'easy', 'question': {'es': '¿Que es la diversificacion?', 'en': 'What is diversification?'}, 'options': {'es': ['Repartir inversiones en diferentes activos', 'Invertir todo en una cosa', 'Vender todos tus activos', 'No invertir'], 'en': ['Spread investments across different assets', 'Invest everything in one thing', 'Sell all assets', 'Not investing']}, 'correct': 0, 'reward': 400},
    {'id': 'e17', 'difficulty': 'easy', 'question': {'es': '¿Que es una tarjeta de credito?', 'en': 'What is a credit card?'}, 'options': {'es': ['Una tarjeta de descuentos', 'Un tipo de ahorro', 'Una tarjeta que te permite comprar con dinero prestado', 'Una inversion'], 'en': ['A discount card', 'A type of saving', 'A card that lets you buy with borrowed money', 'An investment']}, 'correct': 2, 'reward': 400},
    {'id': 'm1', 'difficulty': 'medium', 'question': {'es': '¿Que es el interes compuesto?', 'en': 'What is compound interest?'}, 'options': {'es': ['Interes solo sobre el capital', 'Un tipo de prestamo', 'El interes que paga el banco', 'Interes sobre el capital mas los intereses acumulados'], 'en': ['Interest only on capital', 'A type of loan', 'Interest the bank pays', 'Interest on capital plus accumulated interest']}, 'correct': 3, 'reward': 600},
    {'id': 'm2', 'difficulty': 'medium', 'question': {'es': '¿Cual es la regla del 72?', 'en': 'What is the Rule of 72?'}, 'options': {'es': ['Dividir 72 entre la tasa de interes para saber cuando se duplica tu dinero', 'Ahorrar 72% del salario', 'Invertir 72% en acciones', 'Gastar maximo 72% del salario'], 'en': ['Divide 72 by interest rate to find doubling time', 'Save 72% of salary', 'Invest 72% in stocks', 'Spend max 72% of salary']}, 'correct': 0, 'reward': 700},
    {'id': 'm3', 'difficulty': 'medium', 'question': {'es': '¿Que es un ETF?', 'en': 'What is an ETF?'}, 'options': {'es': ['Una criptomoneda', 'Un impuesto', 'Un fondo que se compra y vende en bolsa como una accion', 'Un prestamo bancario'], 'en': ['A cryptocurrency', 'A tax', 'A fund bought and sold on exchange like a stock', 'A bank loan']}, 'correct': 2, 'reward': 600},
    {'id': 'm4', 'difficulty': 'medium', 'question': {'es': '¿Que es una orden stop-loss?', 'en': 'What is a stop-loss order?'}, 'options': {'es': ['Una orden para comprar mas', 'Una forma de duplicar posicion', 'Una orden automatica para vender y limitar perdidas', 'Un tipo de inversion a largo plazo'], 'en': ['An order to buy more', 'A way to double position', 'An automatic sell order to limit losses', 'A long-term investment']}, 'correct': 2, 'reward': 700},
    {'id': 'm5', 'difficulty': 'medium', 'question': {'es': '¿Que significa mercado alcista (bull market)?', 'en': 'What does bull market mean?'}, 'options': {'es': ['Mercado sin movimiento', 'Un mercado donde los precios suben constantemente', 'Mercado solo para expertos', 'Mercado donde los precios bajan'], 'en': ['Stagnant market', 'A market where prices consistently rise', 'Expert-only market', 'Market where prices fall']}, 'correct': 1, 'reward': 600},
    {'id': 'm6', 'difficulty': 'medium', 'question': {'es': '¿Que es el spread en trading?', 'en': 'What is the spread in trading?'}, 'options': {'es': ['La ganancia total', 'La diferencia entre precio de compra y venta', 'Una comision fija', 'El volumen diario'], 'en': ['Total profit', 'The difference between buy and sell price', 'A fixed commission', 'Daily volume']}, 'correct': 1, 'reward': 700},
    {'id': 'm7', 'difficulty': 'medium', 'question': {'es': '¿Que es el apalancamiento financiero?', 'en': 'What is financial leverage?'}, 'options': {'es': ['Ahorrar en efectivo', 'Vender todas tus acciones', 'Usar deuda para aumentar el potencial de inversion', 'Invertir solo en inmuebles'], 'en': ['Saving cash', 'Selling all stocks', 'Using debt to increase investment potential', 'Only investing in real estate']}, 'correct': 2, 'reward': 700},
    {'id': 'm8', 'difficulty': 'medium', 'question': {'es': '¿Que es Bitcoin?', 'en': 'What is Bitcoin?'}, 'options': {'es': ['Una moneda fisica', 'Una aplicacion bancaria', 'Un tipo de accion', 'Una moneda digital descentralizada basada en blockchain'], 'en': ['A physical currency', 'A banking app', 'A type of stock', 'A decentralized digital currency based on blockchain']}, 'correct': 3, 'reward': 600},
    {'id': 'm9', 'difficulty': 'medium', 'question': {'es': '¿Que es una wallet de criptomonedas?', 'en': 'What is a crypto wallet?'}, 'options': {'es': ['Un banco cripto', 'Software que almacena tus claves privadas', 'Una tarjeta de credito digital', 'Un exchange'], 'en': ['A crypto bank', 'Software that stores your private keys', 'A digital credit card', 'An exchange']}, 'correct': 1, 'reward': 600},
    {'id': 'm10', 'difficulty': 'medium', 'question': {'es': '¿Que es un mercado bajista (bear market)?', 'en': 'What is a bear market?'}, 'options': {'es': ['Mercado sin regulacion', 'Mercado exclusivo para grandes inversores', 'Mercado donde los precios caen 20% o mas', 'Mercado donde solo se venden acciones'], 'en': ['Unregulated market', 'Large-investor-only market', 'Market where prices fall 20% or more', 'Stock-only market']}, 'correct': 2, 'reward': 600},
    {'id': 'm11', 'difficulty': 'medium', 'question': {'es': '¿Que es el Dollar Cost Averaging (DCA)?', 'en': 'What is Dollar Cost Averaging?'}, 'options': {'es': ['Invertir cantidades fijas a intervalos regulares', 'Invertir todo de una vez', 'Comprar solo cuando baja', 'Vender en pequenas cantidades'], 'en': ['Investing fixed amounts at regular intervals', 'Investing all at once', 'Buying only when price drops', 'Selling in small amounts']}, 'correct': 0, 'reward': 700},
    {'id': 'm12', 'difficulty': 'medium', 'question': {'es': '¿Que significa HODL en crypto?', 'en': 'What does HODL mean in crypto?'}, 'options': {'es': ['Vender rapido', 'Comprar solo Bitcoin', 'Mantener tus criptos a largo plazo sin vender', 'Un tipo de moneda'], 'en': ['Sell quickly', 'Buy only Bitcoin', 'Hold your crypto long-term without selling', 'A type of coin']}, 'correct': 2, 'reward': 600},
    {'id': 'm13', 'difficulty': 'medium', 'question': {'es': '¿Que es un exchange de criptomonedas?', 'en': 'What is a crypto exchange?'}, 'options': {'es': ['Una plataforma para comprar, vender e intercambiar criptos', 'Un banco cripto', 'Un tipo de blockchain', 'Una billetera digital'], 'en': ['A platform to buy, sell and trade crypto', 'A crypto bank', 'A type of blockchain', 'A digital wallet']}, 'correct': 0, 'reward': 600},
    {'id': 'm14', 'difficulty': 'medium', 'question': {'es': '¿Que es un fondo indexado?', 'en': 'What is an index fund?'}, 'options': {'es': ['Un fondo de emergencia', 'Un prestamo indexado', 'Una criptomoneda', 'Un fondo que replica el rendimiento de un indice bursatil'], 'en': ['An emergency fund', 'An indexed loan', 'A cryptocurrency', 'A fund that replicates a stock market index performance']}, 'correct': 3, 'reward': 600},
    {'id': 'm15', 'difficulty': 'medium', 'question': {'es': '¿Que es un dividendo?', 'en': 'What is a dividend?'}, 'options': {'es': ['Una deuda de la empresa', 'Parte de las ganancias que una empresa reparte a sus accionistas', 'Un impuesto sobre acciones', 'El precio de una accion'], 'en': ['A company debt', 'A portion of profits a company distributes to shareholders', 'A stock tax', 'A stock price']}, 'correct': 1, 'reward': 600},
    {'id': 'm16', 'difficulty': 'medium', 'question': {'es': '¿Que es la capitalizacion de mercado?', 'en': 'What is market capitalization?'}, 'options': {'es': ['El volumen diario de transacciones', 'La inversion inicial del creador', 'Precio de la accion multiplicado por total de acciones en circulacion', 'El precio maximo alcanzado'], 'en': ['Daily transaction volume', "Creator's initial investment", 'Stock price multiplied by total shares outstanding', 'Highest price reached']}, 'correct': 2, 'reward': 700},
    {'id': 'm17', 'difficulty': 'medium', 'question': {'es': '¿Que es el staking de criptomonedas?', 'en': 'What is crypto staking?'}, 'options': {'es': ['Vender criptos rapido', 'Minar con hardware', 'Bloquear tus criptos para obtener recompensas', 'Transferir entre wallets'], 'en': ['Selling crypto fast', 'Mining with hardware', 'Locking your crypto to earn rewards', 'Transferring between wallets']}, 'correct': 2, 'reward': 600},
    {'id': 'h1', 'difficulty': 'hard', 'question': {'es': '¿Que es un contrato inteligente (smart contract)?', 'en': 'What is a smart contract?'}, 'options': {'es': ['Un contrato firmado digitalmente', 'Un acuerdo entre exchanges', 'Un programa que se ejecuta automaticamente al cumplir condiciones', 'Un contrato bancario'], 'en': ['A digitally signed contract', 'An agreement between exchanges', 'A program that executes automatically when conditions are met', 'A bank contract']}, 'correct': 2, 'reward': 800},
    {'id': 'h2', 'difficulty': 'hard', 'question': {'es': '¿Que es DeFi (Finanzas Descentralizadas)?', 'en': 'What is DeFi?'}, 'options': {'es': ['Un nuevo banco digital', 'Una criptomoneda nueva', 'Un sistema de pago', 'Servicios financieros sin intermediarios usando blockchain'], 'en': ['A new digital bank', 'A new cryptocurrency', 'A payment system', 'Financial services without intermediaries using blockchain']}, 'correct': 3, 'reward': 800},
    {'id': 'h3', 'difficulty': 'hard', 'question': {'es': '¿Que es el halving de Bitcoin?', 'en': 'What is Bitcoin halving?'}, 'options': {'es': ['La reduccion a la mitad de la recompensa de mineria cada 4 anos', 'Cuando el precio se divide por la mitad', 'Una forma de dividir tus Bitcoin', 'Un error en la red'], 'en': ['Halving of mining rewards every 4 years', 'When Bitcoin price is cut in half', 'A way to split your Bitcoin', 'A network bug']}, 'correct': 0, 'reward': 900},
    {'id': 'h4', 'difficulty': 'hard', 'question': {'es': '¿Que es un NFT?', 'en': 'What is an NFT?'}, 'options': {'es': ['Una moneda digital como Bitcoin', 'Un fondo de inversion', 'Activos digitales unicos e irrepetibles en blockchain', 'Acciones tecnologicas'], 'en': ['A digital currency like Bitcoin', 'An investment fund', 'Unique non-replicable digital assets on blockchain', 'Tech stocks']}, 'correct': 2, 'reward': 800},
    {'id': 'h5', 'difficulty': 'hard', 'question': {'es': '¿Que es el analisis tecnico en trading?', 'en': 'What is technical analysis in trading?'}, 'options': {'es': ['Analizar graficos y patrones historicos para predecir movimientos', 'Estudiar noticias del mercado', 'Revisar estados financieros', 'Consultar expertos'], 'en': ['Analyzing charts and historical patterns to predict movements', 'Studying market news', 'Reviewing financial statements', 'Consulting experts']}, 'correct': 0, 'reward': 800},
    {'id': 'h6', 'difficulty': 'hard', 'question': {'es': '¿Que es un pool de liquidez en DeFi?', 'en': 'What is a liquidity pool in DeFi?'}, 'options': {'es': ['Una cuenta bancaria', 'Un fondo de pares de tokens que facilita el intercambio descentralizado', 'Un tipo de prestamo', 'Una wallet especial'], 'en': ['A bank account', 'A pool of token pairs that facilitates decentralized exchange', 'A type of loan', 'A special wallet']}, 'correct': 1, 'reward': 900},
    {'id': 'h7', 'difficulty': 'hard', 'question': {'es': '¿Que es el yield farming?', 'en': 'What is yield farming?'}, 'options': {'es': ['Agricultura digital', 'Minar Bitcoin', 'Estrategia de mover fondos entre protocolos DeFi para maximizar rendimientos', 'Comprar terrenos virtuales'], 'en': ['Digital agriculture', 'Mining Bitcoin', 'Strategy of moving funds between DeFi protocols to maximize returns', 'Buying virtual land']}, 'correct': 2, 'reward': 900},
    {'id': 'h8', 'difficulty': 'hard', 'question': {'es': '¿Que es una ICO (Oferta Inicial de Moneda)?', 'en': 'What is an ICO?'}, 'options': {'es': ['Un tipo de exchange', 'Venta inicial de tokens de un nuevo proyecto crypto para recaudar fondos', 'Una regulacion gubernamental', 'Un tipo de wallet'], 'en': ['A type of exchange', 'Initial token sale of a new crypto project to raise funds', 'A government regulation', 'A type of wallet']}, 'correct': 1, 'reward': 800},
    {'id': 'h9', 'difficulty': 'hard', 'question': {'es': '¿Que es el slippage en trading?', 'en': 'What is slippage in trading?'}, 'options': {'es': ['Una comision del broker', 'Un tipo de orden', 'La diferencia entre el precio esperado y el precio real de ejecucion', 'Un indicador tecnico'], 'en': ['A broker commission', 'A type of order', 'The difference between expected price and actual execution price', 'A technical indicator']}, 'correct': 2, 'reward': 900},
    {'id': 'h10', 'difficulty': 'hard', 'question': {'es': '¿Que es una DAO?', 'en': 'What is a DAO?'}, 'options': {'es': ['Un tipo de criptomoneda', 'Una organizacion autonoma descentralizada gobernada por smart contracts', 'Un exchange', 'Un protocolo de mineria'], 'en': ['A type of cryptocurrency', 'A decentralized autonomous organization governed by smart contracts', 'An exchange', 'A mining protocol']}, 'correct': 1, 'reward': 900},
    {'id': 'h11', 'difficulty': 'hard', 'question': {'es': '¿Que es el gas fee en Ethereum?', 'en': 'What is gas fee in Ethereum?'}, 'options': {'es': ['El precio de Ethereum', 'Un impuesto gubernamental', 'La tarifa que pagas por procesar transacciones en la red Ethereum', 'Una comision de exchange'], 'en': ['The price of Ethereum', 'A government tax', 'The fee you pay to process transactions on Ethereum network', 'An exchange commission']}, 'correct': 2, 'reward': 800},
    {'id': 'h12', 'difficulty': 'hard', 'question': {'es': '¿Que es una stablecoin?', 'en': 'What is a stablecoin?'}, 'options': {'es': ['Una cripto que sube mucho', 'Una criptomoneda vinculada al valor de un activo estable como el dolar', 'Un token de juego', 'Una moneda fisica digital'], 'en': ['A crypto that rises a lot', 'A cryptocurrency pegged to a stable asset like the dollar', 'A gaming token', 'A digital physical coin']}, 'correct': 1, 'reward': 800},
    {'id': 'h13', 'difficulty': 'hard', 'question': {'es': '¿Que es el analisis fundamental?', 'en': 'What is fundamental analysis?'}, 'options': {'es': ['Analizar graficos de precios', 'Evaluar el valor real de un activo examinando factores economicos y financieros', 'Seguir tendencias de redes sociales', 'Copiar trades de otros'], 'en': ['Analyzing price charts', 'Evaluating the real value of an asset by examining economic and financial factors', 'Following social media trends', "Copying others' trades"]}, 'correct': 1, 'reward': 900},
    {'id': 'h14', 'difficulty': 'hard', 'question': {'es': '¿Que es un token de gobernanza?', 'en': 'What is a governance token?'}, 'options': {'es': ['Una moneda estable', 'Un token que da derecho a votar en decisiones de un protocolo DeFi', 'Un NFT', 'Una moneda de juego'], 'en': ['A stablecoin', 'A token that gives voting rights in DeFi protocol decisions', 'An NFT', 'A gaming coin']}, 'correct': 1, 'reward': 800},
    {'id': 'h15', 'difficulty': 'hard', 'question': {'es': '¿Que es el impermanent loss?', 'en': 'What is impermanent loss?'}, 'options': {'es': ['Perder tu wallet', 'Perdida temporal que ocurre al proveer liquidez cuando el precio de los tokens cambia', 'Un hackeo', 'Perder tu contrasena'], 'en': ['Losing your wallet', 'Temporary loss from providing liquidity when token prices change', 'A hack', 'Losing your password']}, 'correct': 1, 'reward': 900},
    {'id': 'h16', 'difficulty': 'hard', 'question': {'es': '¿Que es el TVL (Total Value Locked) en DeFi?', 'en': 'What is TVL in DeFi?'}, 'options': {'es': ['El precio total de todos los tokens', 'El valor total de activos depositados en protocolos DeFi', 'El volumen de trading diario', 'La capitalizacion de mercado'], 'en': ['Total price of all tokens', 'Total value of assets deposited in DeFi protocols', 'Daily trading volume', 'Market capitalization']}, 'correct': 1, 'reward': 900},
]

# Investment opportunities
INVESTMENTS = [
    {"id": "inv1", "type": "real_estate", "name": {"es": "Apartamento Pequeño", "en": "Small Apartment", "pt": "Apartamento Pequeno", "fr": "Petit Appartement", "de": "Kleine Wohnung", "it": "Piccolo Appartamento", "zh": "小公寓"}, "cost": 25000, "down_payment": 5000, "monthly_income": 200, "description": {"es": "Apartamento de 1 habitación en zona urbana", "en": "1-bedroom apartment in urban area", "pt": "Apartamento de 1 quarto em área urbana", "fr": "Appartement 1 chambre en zone urbaine", "de": "1-Zimmer-Wohnung in der Stadt", "it": "Monolocale in zona urbana", "zh": "城区一居室公寓"}},
    {"id": "inv2", "type": "real_estate", "name": {"es": "Casa Dúplex", "en": "Duplex House", "pt": "Casa Duplex", "fr": "Maison Duplex", "de": "Doppelhaus", "it": "Casa Duplex", "zh": "双层住宅"}, "cost": 80000, "down_payment": 16000, "monthly_income": 600, "description": {"es": "Dos unidades de alquiler en buena zona", "en": "Two rental units in a good area", "pt": "Duas unidades de aluguel em boa área", "fr": "Deux unités locatives dans un bon quartier", "de": "Zwei Mieteinheiten in guter Lage", "it": "Due unità in affitto in buona zona", "zh": "好地段的两套出租单元"}},
    {"id": "inv3", "type": "real_estate", "name": {"es": "Edificio Comercial", "en": "Commercial Building", "pt": "Edifício Comercial", "fr": "Immeuble Commercial", "de": "Geschäftsgebäude", "it": "Edificio Commerciale", "zh": "商业大楼"}, "cost": 200000, "down_payment": 40000, "monthly_income": 2000, "description": {"es": "Edificio de oficinas con múltiples inquilinos", "en": "Office building with multiple tenants", "pt": "Edifício de escritórios com múltiplos inquilinos", "fr": "Immeuble de bureaux avec plusieurs locataires", "de": "Bürogebäude mit mehreren Mietern", "it": "Edificio per uffici con più inquilini", "zh": "多租户办公楼"}},
    {"id": "inv4", "type": "stocks", "name": {"es": "Acciones Tecnológicas", "en": "Tech Stocks", "pt": "Ações de Tecnologia", "fr": "Actions Technologiques", "de": "Technologie-Aktien", "it": "Azioni Tecnologiche", "zh": "科技股"}, "cost": 5000, "down_payment": 5000, "monthly_income": 100, "description": {"es": "Paquete de acciones en empresas tecnológicas", "en": "Package of tech company stocks", "pt": "Pacote de ações em empresas de tecnologia", "fr": "Paquet d'actions dans des entreprises technologiques", "de": "Aktienpaket in Technologieunternehmen", "it": "Pacchetto di azioni in aziende tecnologiche", "zh": "科技公司股票组合"}},
    {"id": "inv5", "type": "stocks", "name": {"es": "Fondo Indexado", "en": "Index Fund", "pt": "Fundo de Índice", "fr": "Fonds Indiciel", "de": "Indexfonds", "it": "Fondo Indicizzato", "zh": "指数基金"}, "cost": 10000, "down_payment": 10000, "monthly_income": 250, "description": {"es": "Fondo diversificado que sigue al mercado", "en": "Diversified fund tracking the market", "pt": "Fundo diversificado que acompanha o mercado", "fr": "Fonds diversifié suivant le marché", "de": "Diversifizierter Fonds, der den Markt verfolgt", "it": "Fondo diversificato che segue il mercato", "zh": "跟踪市场的多元化基金"}},
    {"id": "inv6", "type": "business", "name": {"es": "Lavandería Automática", "en": "Laundromat", "pt": "Lavanderia Automática", "fr": "Laverie Automatique", "de": "Waschsalon", "it": "Lavanderia Automatica", "zh": "自助洗衣店"}, "cost": 30000, "down_payment": 10000, "monthly_income": 500, "description": {"es": "Negocio semi-pasivo con flujo constante", "en": "Semi-passive business with steady flow", "pt": "Negócio semi-passivo com fluxo constante", "fr": "Entreprise semi-passive avec flux constant", "de": "Halbpassives Geschäft mit stetigem Fluss", "it": "Attività semi-passiva con flusso costante", "zh": "半被动经营，稳定现金流"}},
    {"id": "inv7", "type": "business", "name": {"es": "Franquicia de Café", "en": "Coffee Franchise", "pt": "Franquia de Café", "fr": "Franchise de Café", "de": "Kaffee-Franchise", "it": "Franchising Caffetteria", "zh": "咖啡特许经营"}, "cost": 50000, "down_payment": 15000, "monthly_income": 800, "description": {"es": "Franquicia con marca reconocida", "en": "Franchise with recognized brand", "pt": "Franquia com marca reconhecida", "fr": "Franchise avec marque reconnue", "de": "Franchise mit bekannter Marke", "it": "Franchising con marchio riconosciuto", "zh": "知名品牌特许经营"}},
    {"id": "inv8", "type": "business", "name": {"es": "E-commerce Store", "en": "E-commerce Store", "pt": "Loja E-commerce", "fr": "Boutique E-commerce", "de": "E-Commerce-Shop", "it": "Negozio E-commerce", "zh": "电子商务商店"}, "cost": 15000, "down_payment": 15000, "monthly_income": 400, "description": {"es": "Tienda online con productos digitales", "en": "Online store with digital products", "pt": "Loja online com produtos digitais", "fr": "Boutique en ligne avec produits numériques", "de": "Online-Shop mit digitalen Produkten", "it": "Negozio online con prodotti digitali", "zh": "数字产品在线商店"}},
]

# Market events (affect investment values)
MARKET_EVENTS = [
    {"id": "m1", "type": "boom", "title": {"es": "Boom Inmobiliario", "en": "Real Estate Boom", "pt": "Boom Imobiliário", "fr": "Boom Immobilier", "de": "Immobilienboom", "it": "Boom Immobiliare", "zh": "房地产繁荣"}, "description": {"es": "Los precios de las propiedades suben 20%", "en": "Property prices rise 20%", "pt": "Os preços dos imóveis sobem 20%", "fr": "Les prix de l'immobilier augmentent de 20%", "de": "Immobilienpreise steigen um 20%", "it": "I prezzi degli immobili salgono del 20%", "zh": "房价上涨20%"}, "affects": "real_estate", "multiplier": 1.2},
    {"id": "m2", "type": "crash", "title": {"es": "Caída del Mercado", "en": "Market Crash", "pt": "Queda do Mercado", "fr": "Crash du Marché", "de": "Marktcrash", "it": "Crollo del Mercato", "zh": "市场崩盘"}, "description": {"es": "Las acciones pierden 30% de su valor", "en": "Stocks lose 30% of their value", "pt": "As ações perdem 30% do seu valor", "fr": "Les actions perdent 30% de leur valeur", "de": "Aktien verlieren 30% ihres Wertes", "it": "Le azioni perdono il 30% del loro valore", "zh": "股票价值下跌30%"}, "affects": "stocks", "multiplier": 0.7},
    {"id": "m3", "type": "boom", "title": {"es": "Auge Tecnológico", "en": "Tech Surge", "pt": "Alta Tecnológica", "fr": "Essor Technologique", "de": "Tech-Aufschwung", "it": "Boom Tecnologico", "zh": "科技股飙升"}, "description": {"es": "Las acciones tecnológicas suben 40%", "en": "Tech stocks surge 40%", "pt": "As ações de tecnologia sobem 40%", "fr": "Les actions technologiques augmentent de 40%", "de": "Tech-Aktien steigen um 40%", "it": "Le azioni tecnologiche salgono del 40%", "zh": "科技股飙升40%"}, "affects": "stocks", "multiplier": 1.4},
    {"id": "m4", "type": "crash", "title": {"es": "Crisis de Alquileres", "en": "Rental Crisis", "pt": "Crise de Aluguéis", "fr": "Crise des Loyers", "de": "Mietkrise", "it": "Crisi degli Affitti", "zh": "租房危机"}, "description": {"es": "Los alquileres bajan 25% por regulación", "en": "Rents drop 25% due to regulation", "pt": "Os aluguéis caem 25% por regulamentação", "fr": "Les loyers baissent de 25% en raison de la réglementation", "de": "Mieten sinken um 25% durch Regulierung", "it": "Gli affitti scendono del 25% per regolamentazione", "zh": "因监管租金下降25%"}, "affects": "real_estate", "multiplier": 0.75},
]

# Opportunity cards
OPPORTUNITIES = [
    {"id": "op1", "title": {"es": "Negocio en Venta", "en": "Business for Sale", "pt": "Negócio à Venda", "fr": "Entreprise à Vendre", "de": "Geschäft zum Verkauf", "it": "Attività in Vendita", "zh": "出售的企业"}, "description": {"es": "Un conocido vende su negocio rentable con descuento", "en": "An acquaintance sells their profitable business at a discount", "pt": "Um conhecido vende seu negócio lucrativo com desconto", "fr": "Une connaissance vend son entreprise rentable à prix réduit", "de": "Ein Bekannter verkauft sein profitables Geschäft mit Rabatt", "it": "Un conoscente vende la sua attività redditizia con sconto", "zh": "一位熟人低价出售其盈利企业"}, "cost": 20000, "monthly_income": 1000},
    {"id": "op2", "title": {"es": "Terreno Subvalorado", "en": "Undervalued Land", "pt": "Terreno Subvalorizado", "fr": "Terrain Sous-évalué", "de": "Unterbewertetes Grundstück", "it": "Terreno Sottovalutato", "zh": "被低估的土地"}, "description": {"es": "Un terreno en zona de desarrollo por debajo del precio de mercado", "en": "Land in a development zone below market price", "pt": "Um terreno em zona de desenvolvimento abaixo do preço de mercado", "fr": "Un terrain en zone de développement en dessous du prix du marché", "de": "Ein Grundstück in einem Entwicklungsgebiet unter Marktpreis", "it": "Un terreno in zona di sviluppo sotto il prezzo di mercato", "zh": "开发区低于市场价的土地"}, "cost": 15000, "monthly_income": 300},
]

# Tax events
TAX_EVENTS = [
    {"id": "tax1", "title": {"es": "Auditoría Fiscal", "en": "Tax Audit", "pt": "Auditoria Fiscal", "fr": "Contrôle Fiscal", "de": "Steuerprüfung", "it": "Controllo Fiscale", "zh": "税务审计"}, "description": {"es": "El gobierno audita tus finanzas. Paga impuestos adicionales.", "en": "The government audits your finances. Pay additional taxes.", "pt": "O governo audita suas finanças. Pague impostos adicionais.", "fr": "Le gouvernement audite vos finances. Payez des taxes supplémentaires.", "de": "Die Regierung prüft Ihre Finanzen. Zahlen Sie zusätzliche Steuern.", "it": "Il governo controlla le tue finanze. Paga tasse aggiuntive.", "zh": "政府审计你的财务。缴纳额外税款。"}, "percentage": 10},
]

# Achievements
ACHIEVEMENTS_DEF = [
    {"id": "first_win", "name": {"es": "Primera Victoria", "en": "First Victory", "pt": "Primeira Vitória", "fr": "Première Victoire", "de": "Erster Sieg", "it": "Prima Vittoria", "zh": "首次胜利"}, "description": {"es": "Gana tu primera partida", "en": "Win your first game", "pt": "Vença seu primeiro jogo", "fr": "Gagnez votre première partie", "de": "Gewinne dein erstes Spiel", "it": "Vinci la tua prima partita", "zh": "赢得你的第一场比赛"}, "icon": "🏆"},
    {"id": "trivia_master", "name": {"es": "Maestro Trivia", "en": "Trivia Master", "pt": "Mestre Trivia", "fr": "Maître Trivia", "de": "Trivia-Meister", "it": "Maestro Trivia", "zh": "问答大师"}, "description": {"es": "Responde 10 preguntas correctas seguidas", "en": "Answer 10 consecutive questions correctly", "pt": "Responda 10 perguntas consecutivas corretamente", "fr": "Répondez correctement à 10 questions consécutives", "de": "Beantworten Sie 10 aufeinanderfolgende Fragen richtig", "it": "Rispondi correttamente a 10 domande consecutive", "zh": "连续答对10题"}, "icon": "🧠"},
    {"id": "investor", "name": {"es": "Gran Inversor", "en": "Big Investor", "pt": "Grande Investidor", "fr": "Grand Investisseur", "de": "Großer Investor", "it": "Grande Investitore", "zh": "大投资家"}, "description": {"es": "Ten 5 activos al mismo tiempo", "en": "Own 5 assets at the same time", "pt": "Tenha 5 ativos ao mesmo tempo", "fr": "Possédez 5 actifs en même temps", "de": "Besitzen Sie gleichzeitig 5 Vermögenswerte", "it": "Possiedi 5 asset contemporaneamente", "zh": "同时拥有5项资产"}, "icon": "💼"},
    {"id": "speed_run", "name": {"es": "Velocista Financiero", "en": "Financial Speedrunner", "pt": "Velocista Financeiro", "fr": "Sprinter Financier", "de": "Finanzieller Sprinter", "it": "Velocista Finanziario", "zh": "金融冲刺者"}, "description": {"es": "Alcanza la libertad financiera en menos de 20 turnos", "en": "Achieve financial freedom in less than 20 turns", "pt": "Alcance a liberdade financeira em menos de 20 turnos", "fr": "Atteignez la liberté financière en moins de 20 tours", "de": "Erreichen Sie finanzielle Freiheit in weniger als 20 Runden", "it": "Raggiungi la libertà finanziaria in meno di 20 turni", "zh": "在20回合内实现财务自由"}, "icon": "⚡"},
    {"id": "millionaire", "name": {"es": "Millonario", "en": "Millionaire", "pt": "Milionário", "fr": "Millionnaire", "de": "Millionär", "it": "Milionario", "zh": "百万富翁"}, "description": {"es": "Acumula $1,000,000 en efectivo", "en": "Accumulate $1,000,000 in cash", "pt": "Acumule $1.000.000 em dinheiro", "fr": "Accumulez 1 000 000 $ en espèces", "de": "Sammeln Sie 1.000.000 $ in bar", "it": "Accumula $1.000.000 in contanti", "zh": "积累100万美元现金"}, "icon": "💰"},
    {"id": "social_butterfly", "name": {"es": "Mariposa Social", "en": "Social Butterfly", "pt": "Borboleta Social", "fr": "Papillon Social", "de": "Geselliger Schmetterling", "it": "Farfalla Sociale", "zh": "社交达人"}, "description": {"es": "Añade 5 amigos", "en": "Add 5 friends", "pt": "Adicione 5 amigos", "fr": "Ajoutez 5 amis", "de": "Füge 5 Freunde hinzu", "it": "Aggiungi 5 amici", "zh": "添加5个好友"}, "icon": "🦋"},
    {"id": "survivor", "name": {"es": "Superviviente", "en": "Survivor", "pt": "Sobrevivente", "fr": "Survivant", "de": "Überlebender", "it": "Sopravvissuto", "zh": "幸存者"}, "description": {"es": "Supera 5 eventos negativos en una partida", "en": "Overcome 5 negative events in one game", "pt": "Supere 5 eventos negativos em um jogo", "fr": "Surmontez 5 événements négatifs en une partie", "de": "Überwinde 5 negative Ereignisse in einem Spiel", "it": "Supera 5 eventi negativi in una partita", "zh": "在一局中克服5个负面事件"}, "icon": "🛡️"},
    {"id": "three_wins", "name": {"es": "Triunfador", "en": "Champion", "pt": "Campeão", "fr": "Champion", "de": "Champion", "it": "Campione", "zh": "三连冠"}, "description": {"es": "Gana 3 partidas", "en": "Win 3 games", "pt": "Vença 3 jogos", "fr": "Gagnez 3 parties", "de": "Gewinne 3 Spiele", "it": "Vinci 3 partite", "zh": "赢得3场比赛"}, "icon": "👑"},
]

# ==================== HELPERS ====================

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

def create_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def normalize_email(email: str) -> str:
    return (email or "").strip().lower()

async def activate_license_for_email(email: str, source: str = "stripe_web", extra: Optional[Dict[str, Any]] = None):
    email_norm = normalize_email(email)
    if not email_norm:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "email": email_norm,
        "email_lower": email_norm,
        "active": True,
        "source": source,
        "updated_at": now_iso,
    }
    if extra:
        payload.update(extra)
    await db.licenses.update_one(
        {"email_lower": email_norm},
        {"$set": payload, "$setOnInsert": {"created_at": now_iso}},
        upsert=True,
    )
    await db.users.update_many(
        {"email": {"$regex": f"^{email_norm}$", "$options": "i"}},
        {"$set": {"license_active": True, "license_source": source, "license_updated_at": now_iso}},
    )

async def sync_user_license(user_id: str, email: str) -> bool:
    email_norm = normalize_email(email)
    if not user_id or not email_norm:
        return False
    lic = await db.licenses.find_one({"email_lower": email_norm, "active": True})
    has_access = bool(lic)
    update_payload = {
        "license_active": has_access,
        "license_source": (lic or {}).get("source", "none"),
        "license_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one({"id": user_id}, {"$set": update_payload})
    return has_access

async def require_active_license_from_token(token: str) -> dict:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("user_id")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    has_access = await sync_user_license(user["id"], user.get("email", ""))
    if not has_access:
        raise HTTPException(status_code=402, detail="License required")
    refreshed = await db.users.find_one({"id": user["id"]})
    return refreshed or user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = str(uuid.uuid4())
    colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]
    
    user_doc = {
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "password_hash": pwd_context.hash(user.password),
        "avatar_color": random.choice(colors),
        "avatar_url": "",
        "invite_code": f"XF-{user.username[:4].upper()}-{''.join(random.choices(string.digits, k=4))}",
        "games_played": 0,
        "games_won": 0,
        "total_net_worth": 0,
        "best_score": 0,
        "achievements": [],
        "friends": [],
        "friend_requests": [],
        "auth_provider": "email",
        "connected_providers": ["email"],
        "language": "es",
        "music_enabled": True,
        "sfx_enabled": True,
        "license_active": False,
        "license_source": "none",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_online": datetime.now(timezone.utc).isoformat(),
        "is_online": False,
    }
    
    await db.users.insert_one(user_doc)
    await sync_user_license(user_id, user.email)
    refreshed = await db.users.find_one({"id": user_id})
    token = create_token({"user_id": user_id, "email": user.email})
    
    safe_user = {k: v for k, v in (refreshed or user_doc).items() if k not in ["password_hash", "_id"]}
    return {"token": token, "user": safe_user}

@api_router.post("/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    await sync_user_license(db_user["id"], db_user.get("email", ""))
    token = create_token({"user_id": db_user["id"], "email": db_user["email"]})
    await db.users.update_one({"id": db_user["id"]}, {"$set": {"is_online": True, "last_online": datetime.now(timezone.utc).isoformat()}})
    db_user = await db.users.find_one({"id": db_user["id"]})
    
    safe_user = {k: v for k, v in db_user.items() if k not in ["password_hash", "_id"]}
    if "auth_provider" not in safe_user:
        safe_user["auth_provider"] = "email"
    if "connected_providers" not in safe_user:
        safe_user["connected_providers"] = ["email"]
    return {"token": token, "user": serialize_doc(safe_user)}

# ==================== GOOGLE OAUTH (no third-party; uses only Google API) ====================

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
FACEBOOK_APP_ID = os.environ.get("FACEBOOK_APP_ID", "").strip()
FACEBOOK_APP_SECRET = os.environ.get("FACEBOOK_APP_SECRET", "").strip()

async def _google_find_or_create_user_async(email: str, name: str, picture: str):
    existing = await db.users.find_one({"email": email})
    if existing:
        # Update with Google info
        update = {"last_online": datetime.now(timezone.utc).isoformat(), "is_online": True}
        if not existing.get("id"):
            # Backward compatibility for legacy users created before "id" was required.
            update["id"] = str(uuid.uuid4())
        if picture and not existing.get("avatar_url"):
            update["avatar_url"] = picture
        if not existing.get("username") or existing["username"] == "Google User":
            update["username"] = name
        raw_connected = existing.get("connected_providers", [])
        if isinstance(raw_connected, list):
            connected = set([p for p in raw_connected if isinstance(p, str) and p.strip()])
        elif isinstance(raw_connected, str) and raw_connected.strip():
            connected = {raw_connected.strip()}
        else:
            connected = set()
        connected.add("google")
        update["connected_providers"] = list(connected)
        if not existing.get("auth_provider"):
            update["auth_provider"] = "google"
        await db.users.update_one({"email": email}, {"$set": update})
        user_doc = await db.users.find_one({"email": email})
    else:
        user_id = str(uuid.uuid4())
        colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
        user_doc = {
            "id": user_id, "username": name, "email": email,
            "password_hash": "", "avatar_color": random.choice(colors),
            "avatar_url": picture,
            "auth_provider": "google",
            "connected_providers": ["google"],
            "invite_code": f"XF-{name[:4].upper()}-{''.join(random.choices(string.digits, k=4))}",
            "games_played": 0, "games_won": 0, "total_net_worth": 0,
            "best_score": 0, "achievements": [], "friends": [],
            "friend_requests": [], "language": "es",
            "music_enabled": True, "sfx_enabled": True, "music_genre": "electronic",
            "license_active": False, "license_source": "none",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_online": datetime.now(timezone.utc).isoformat(), "is_online": True,
        }
        await db.users.insert_one(user_doc)
    
    user_id = user_doc.get("id")
    if not user_id:
        # Last-resort guard to prevent OAuth callback 500 on legacy docs.
        user_id = str(uuid.uuid4())
        await db.users.update_one({"email": email}, {"$set": {"id": user_id}})
    await sync_user_license(user_id, email)
    user_doc = await db.users.find_one({"id": user_id})
    token = create_token({"user_id": user_id, "email": email})
    safe_user = {k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]}
    return {"token": token, "user": serialize_doc(safe_user)}


async def _facebook_find_or_create_user_async(email: str, name: str, picture: str):
    existing = await db.users.find_one({"email": email})
    if existing:
        update = {"last_online": datetime.now(timezone.utc).isoformat(), "is_online": True}
        if not existing.get("id"):
            # Backward compatibility for legacy users created before "id" was required.
            update["id"] = str(uuid.uuid4())
        if picture and not existing.get("avatar_url"):
            update["avatar_url"] = picture
        if not existing.get("username") or existing["username"] == "Facebook User":
            update["username"] = name
        raw_connected = existing.get("connected_providers", [])
        if isinstance(raw_connected, list):
            connected = set([p for p in raw_connected if isinstance(p, str) and p.strip()])
        elif isinstance(raw_connected, str) and raw_connected.strip():
            connected = {raw_connected.strip()}
        else:
            connected = set()
        connected.add("facebook")
        update["connected_providers"] = list(connected)
        if not existing.get("auth_provider"):
            update["auth_provider"] = "facebook"
        await db.users.update_one({"email": email}, {"$set": update})
        user_doc = await db.users.find_one({"email": email})
    else:
        user_id = str(uuid.uuid4())
        colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
        user_doc = {
            "id": user_id, "username": name, "email": email,
            "password_hash": "", "avatar_color": random.choice(colors),
            "avatar_url": picture,
            "auth_provider": "facebook",
            "connected_providers": ["facebook"],
            "invite_code": f"XF-{name[:4].upper()}-{''.join(random.choices(string.digits, k=4))}",
            "games_played": 0, "games_won": 0, "total_net_worth": 0,
            "best_score": 0, "achievements": [], "friends": [],
            "friend_requests": [], "language": "es",
            "music_enabled": True, "sfx_enabled": True, "music_genre": "electronic",
            "license_active": False, "license_source": "none",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_online": datetime.now(timezone.utc).isoformat(), "is_online": True,
        }
        await db.users.insert_one(user_doc)

    user_id = user_doc.get("id")
    if not user_id:
        # Last-resort guard to prevent OAuth callback 500 on legacy docs.
        user_id = str(uuid.uuid4())
        await db.users.update_one({"email": email}, {"$set": {"id": user_id}})
    await sync_user_license(user_id, email)
    user_doc = await db.users.find_one({"id": user_id})
    token = create_token({"user_id": user_id, "email": email})
    safe_user = {k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]}
    return {"token": token, "user": serialize_doc(safe_user)}


BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")

def _looks_localhost(url: str) -> bool:
    u = (url or "").lower()
    return ("localhost" in u) or ("127.0.0.1" in u)

def _request_public_origin(request: Request) -> str:
    """Return externally reachable origin using proxy headers when present."""
    xf_proto = (request.headers.get("x-forwarded-proto") or "").split(",")[0].strip()
    xf_host = (request.headers.get("x-forwarded-host") or "").split(",")[0].strip()
    host = xf_host or (request.headers.get("host") or "").strip()
    proto = xf_proto or request.url.scheme or "http"
    if host:
        return f"{proto}://{host}".rstrip("/")
    return str(request.base_url).rstrip("/")

def _oauth_public_base(request: Request) -> str:
    """
    Prefer env URL when it is truly public.
    If env points to localhost, derive from incoming request (LAN/proxy safe).
    """
    if BACKEND_PUBLIC_URL and not _looks_localhost(BACKEND_PUBLIC_URL):
        return BACKEND_PUBLIC_URL.rstrip("/")
    return _request_public_origin(request)

@api_router.get("/auth/google")
async def google_oauth_start(request: Request, redirect_uri: str = ""):
    """Redirect user to Google sign-in. redirect_uri = frontend URL to return to with token."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server .env",
        )
    if not redirect_uri:
        raise HTTPException(status_code=400, detail="redirect_uri is required")
    callback_base = _oauth_public_base(request)
    callback_url = f"{callback_base}/api/auth/google/callback"
    state = base64.urlsafe_b64encode(redirect_uri.encode()).decode()
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(callback_url)}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        f"state={state}"
    )
    return RedirectResponse(url=url)


@api_router.get("/auth/google/callback")
async def google_oauth_callback(request: Request, code: str = "", state: str = ""):
    """Exchange code for user info and redirect to frontend with token."""
    try:
        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing code or state")
        try:
            redirect_uri = base64.urlsafe_b64decode(state.encode()).decode()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid state")
        callback_base = _oauth_public_base(request)
        callback_url = f"{callback_base}/api/auth/google/callback"
        import requests as req_lib
        resp = req_lib.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Google token exchange failed")
        data = resp.json()
        id_token = data.get("id_token") or data.get("access_token")
        if not id_token:
            raise HTTPException(status_code=401, detail="No token from Google")
        info_resp = req_lib.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
            timeout=5,
        )
        if info_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        info = info_resp.json()
        if info.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token audience mismatch")
        email = info.get("email", "")
        name = info.get("name", "Google User")
        picture = info.get("picture", "")
        result = await _google_find_or_create_user_async(email, name, picture)
        token = result["token"]
        sep = "&" if "?" in redirect_uri else "?"
        return RedirectResponse(url=f"{redirect_uri}{sep}token={token}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in Google OAuth callback")
        raise HTTPException(status_code=500, detail=f"google_callback_internal:{type(e).__name__}")


@api_router.get("/auth/facebook")
async def facebook_oauth_start(request: Request, redirect_uri: str = ""):
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Facebook login is not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in the server .env",
        )
    if not redirect_uri:
        raise HTTPException(status_code=400, detail="redirect_uri is required")
    callback_base = _oauth_public_base(request)
    callback_url = f"{callback_base}/api/auth/facebook/callback"
    state = base64.urlsafe_b64encode(redirect_uri.encode()).decode()
    url = (
        "https://www.facebook.com/v20.0/dialog/oauth?"
        f"client_id={FACEBOOK_APP_ID}&"
        f"redirect_uri={urllib.parse.quote(callback_url)}&"
        "response_type=code&"
        "scope=email,public_profile&"
        f"state={state}"
    )
    return RedirectResponse(url=url)


@api_router.get("/auth/facebook/callback")
async def facebook_oauth_callback(request: Request, code: str = "", state: str = ""):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    try:
        redirect_uri = base64.urlsafe_b64decode(state.encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid state")

    callback_base = _oauth_public_base(request)
    callback_url = f"{callback_base}/api/auth/facebook/callback"
    import requests as req_lib
    token_resp = req_lib.get(
        "https://graph.facebook.com/v20.0/oauth/access_token",
        params={
            "client_id": FACEBOOK_APP_ID,
            "client_secret": FACEBOOK_APP_SECRET,
            "redirect_uri": callback_url,
            "code": code,
        },
        timeout=10,
    )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Facebook token exchange failed")

    access_token = token_resp.json().get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="No token from Facebook")

    profile_resp = req_lib.get(
        "https://graph.facebook.com/me",
        params={
            "fields": "id,name,email,picture.type(large)",
            "access_token": access_token,
        },
        timeout=10,
    )
    if profile_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Facebook token")
    profile = profile_resp.json()
    email = profile.get("email", "")
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Facebook account has no public email permission; enable email permission in app settings.",
        )
    name = profile.get("name", "Facebook User")
    picture = ((profile.get("picture") or {}).get("data") or {}).get("url", "")
    result = await _facebook_find_or_create_user_async(email, name, picture)
    token = result["token"]
    sep = "&" if "?" in redirect_uri else "?"
    return RedirectResponse(url=f"{redirect_uri}{sep}token={token}")


@api_router.get("/auth/providers")
async def get_auth_providers():
    google_enabled = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    facebook_enabled = bool(FACEBOOK_APP_ID and FACEBOOK_APP_SECRET)
    return {
        "providers": {
            "google": {"enabled": google_enabled},
            "facebook": {"enabled": facebook_enabled, "status": "ready" if facebook_enabled else "coming_soon"},
        }
    }


@api_router.post("/billing/stripe/create-checkout-session")
async def create_stripe_checkout_session(data: dict):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    email = normalize_email(data.get("email", ""))
    if not email:
        raise HTTPException(status_code=400, detail="email is required")

    success_url = (data.get("success_url") or f"{PLAY_SITE_URL}/unlock?from=stripe").strip()
    cancel_url = (data.get("cancel_url") or f"{MARKETING_SITE_URL}").strip()
    source = (data.get("source") or "landing_web").strip()

    line_item = (
        [{"price": STRIPE_PRICE_ID, "quantity": 1}]
        if STRIPE_PRICE_ID
        else [{
            "price_data": {
                "currency": "eur",
                "unit_amount": STRIPE_PROMO_AMOUNT_EUR_CENTS,
                "product_data": {"name": "Xamox Flow Web Access"},
            },
            "quantity": 1,
        }]
    )

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            customer_email=email,
            line_items=line_item,
            success_url=success_url,
            cancel_url=cancel_url,
            allow_promotion_codes=True,
            metadata={
                "email": email,
                "source": source,
                "product": "xamox_flow_web_access",
            },
            client_reference_id=email,
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        logger.exception("Stripe checkout session creation failed")
        raise HTTPException(status_code=500, detail=f"Stripe checkout failed: {type(e).__name__}")


@api_router.get("/billing/stripe/checkout-start")
async def stripe_checkout_start(email: str = "", source: str = "landing_web", success_url: str = "", cancel_url: str = ""):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    email_norm = normalize_email(email)
    success = (success_url or f"{PLAY_SITE_URL}/unlock?from=stripe").strip()
    cancel = (cancel_url or f"{MARKETING_SITE_URL}").strip()

    line_item = (
        [{"price": STRIPE_PRICE_ID, "quantity": 1}]
        if STRIPE_PRICE_ID
        else [{
            "price_data": {
                "currency": "eur",
                "unit_amount": STRIPE_PROMO_AMOUNT_EUR_CENTS,
                "product_data": {"name": "Xamox Flow Web Access"},
            },
            "quantity": 1,
        }]
    )
    kwargs = {
        "mode": "payment",
        "line_items": line_item,
        "success_url": success,
        "cancel_url": cancel,
        "allow_promotion_codes": True,
        "metadata": {
            "source": source or "landing_web",
            "product": "xamox_flow_web_access",
            "email": email_norm,
        },
    }
    if email_norm:
        kwargs["customer_email"] = email_norm
        kwargs["client_reference_id"] = email_norm
    session = stripe.checkout.Session.create(**kwargs)
    return RedirectResponse(url=session.url)


@api_router.post("/billing/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
        else:
            event = json.loads(payload.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook")

    event_type = event.get("type")
    event_data = (event.get("data") or {}).get("object") or {}

    if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        paid_email = normalize_email(
            ((event_data.get("customer_details") or {}).get("email"))
            or event_data.get("customer_email")
            or (event_data.get("metadata") or {}).get("email")
            or ""
        )
        if paid_email:
            await activate_license_for_email(
                paid_email,
                source="stripe_web",
                extra={
                    "stripe_session_id": event_data.get("id"),
                    "stripe_payment_intent": event_data.get("payment_intent"),
                    "amount_total": event_data.get("amount_total"),
                    "currency": event_data.get("currency"),
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                },
            )

    return {"received": True}


@api_router.get("/billing/license-status")
async def billing_license_status(token: str = "", email: str = ""):
    if token:
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        active = await sync_user_license(user["id"], user.get("email", ""))
        user = await db.users.find_one({"id": user["id"]}) or user
        return {
            "active": active,
            "source": user.get("license_source", "none"),
            "email": user.get("email", ""),
        }

    email_norm = normalize_email(email)
    if not email_norm:
        raise HTTPException(status_code=400, detail="token or email is required")
    lic = await db.licenses.find_one({"email_lower": email_norm, "active": True})
    return {
        "active": bool(lic),
        "source": (lic or {}).get("source", "none"),
        "email": email_norm,
    }


@api_router.get("/diag/db")
async def diag_db():
    """Temporary diagnostics endpoint to validate Mongo connectivity in production."""
    try:
        ping = await db.command("ping")
        return {"ok": True, "mongo": ping}
    except Exception as e:
        logger.exception("MongoDB diagnostics failed")
        return {"ok": False, "error_type": type(e).__name__, "error": str(e)}


# ==================== MUSIC GENRES ====================

MUSIC_GENRES = {
    "electronic": {"name": {"es": "Electronica", "en": "Electronic"}, "icon": "🎧", "color": "#62C6FF"},
    "pop": {"name": {"es": "Pop", "en": "Pop"}, "icon": "🎵", "color": "#FF69B4"},
    "rock": {"name": {"es": "Rock", "en": "Rock"}, "icon": "🎸", "color": "#FF5A6A"},
    "latin": {"name": {"es": "Latina", "en": "Latin"}, "icon": "💃", "color": "#FF9F40"},
    "hiphop": {"name": {"es": "Hip Hop", "en": "Hip Hop"}, "icon": "🎤", "color": "#AA7AFF"},
    "chill": {"name": {"es": "Chill / Lofi", "en": "Chill / Lofi"}, "icon": "🌊", "color": "#39D98A"},
}

@api_router.get("/music/genres")
async def get_music_genres():
    return {"genres": MUSIC_GENRES}

@api_router.put("/music/preference")
async def set_music_preference(data: dict):
    token = data.get("token", "")
    genre = data.get("genre", "electronic")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    await db.users.update_one({"id": payload["user_id"]}, {"$set": {"music_genre": genre}})
    return {"message": "Music preference saved", "genre": genre}
@api_router.post("/auth/test-login")
async def test_login():
    """Quick login for testing - creates or logs in test user"""
    test_email = "test@xamoxflow.com"
    db_user = await db.users.find_one({"email": test_email})
    if not db_user:
        user_id = str(uuid.uuid4())
        db_user = {
            "id": user_id, "username": "TestPlayer", "email": test_email,
            "password_hash": pwd_context.hash("test123"),
            "avatar_color": "#FFD700", "games_played": 0, "games_won": 0,
            "total_net_worth": 0, "best_score": 0, "achievements": [],
            "auth_provider": "email", "connected_providers": ["email"],
            "friends": [], "friend_requests": [], "language": "es",
            "music_enabled": True, "sfx_enabled": True,
            "license_active": True, "license_source": "test",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_online": datetime.now(timezone.utc).isoformat(), "is_online": True,
        }
        await db.users.insert_one(db_user)
    
    token = create_token({"user_id": db_user["id"], "email": db_user["email"]})
    safe_user = {k: v for k, v in db_user.items() if k not in ["password_hash", "_id"]}
    return {"token": token, "user": serialize_doc(safe_user)}

@api_router.get("/auth/me")
async def get_me(token: str = ""):
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await sync_user_license(user["id"], user.get("email", ""))
    user = await db.users.find_one({"id": payload["user_id"]}) or user
    
    safe_user = {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}
    if "auth_provider" not in safe_user:
        safe_user["auth_provider"] = "email"
    if "connected_providers" not in safe_user:
        safe_user["connected_providers"] = ["email"]
    return {"user": serialize_doc(safe_user)}

@api_router.put("/auth/settings")
async def update_settings(settings: dict):
    token = settings.get("token", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    update_fields = {}
    for field in ["language", "music_enabled", "sfx_enabled", "username", "avatar_color"]:
        if field in settings:
            update_fields[field] = settings[field]
    
    if update_fields:
        await db.users.update_one({"id": payload["user_id"]}, {"$set": update_fields})
    
    user = await db.users.find_one({"id": payload["user_id"]})
    safe_user = {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}
    return {"user": serialize_doc(safe_user)}

# ==================== PROFILE PHOTO ====================

@api_router.post("/auth/upload-photo")
async def upload_photo(file: UploadFile = File(...), token: str = Form("")):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")
    
    # Store as base64 in MongoDB
    b64 = base64.b64encode(content).decode('utf-8')
    content_type = file.content_type or 'image/jpeg'
    photo_url = f"data:{content_type};base64,{b64}"
    
    await db.users.update_one({"id": payload["user_id"]}, {"$set": {"avatar_url": photo_url}})
    
    user = await db.users.find_one({"id": payload["user_id"]})
    safe_user = {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}
    return {"user": serialize_doc(safe_user)}

# ==================== INVITE CODES ====================

@api_router.get("/user/invite-code")
async def get_invite_code(token: str = ""):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload["user_id"]})
    invite_code = user.get("invite_code")
    if not invite_code:
        invite_code = f"XF-{user['username'][:4].upper()}-{''.join(random.choices(string.digits, k=4))}"
        await db.users.update_one({"id": payload["user_id"]}, {"$set": {"invite_code": invite_code}})
    
    return {"invite_code": invite_code, "username": user["username"]}

@api_router.post("/user/use-invite")
async def use_invite_code(data: dict):
    token = data.get("token", "")
    code = data.get("code", "")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Find user with this invite code
    inviter = await db.users.find_one({"invite_code": code})
    if not inviter:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if inviter["id"] == payload["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot use your own code")
    
    # Auto add as friends
    me = await db.users.find_one({"id": payload["user_id"]})
    if inviter["id"] not in me.get("friends", []):
        await db.users.update_one({"id": payload["user_id"]}, {"$addToSet": {"friends": inviter["id"]}})
        await db.users.update_one({"id": inviter["id"]}, {"$addToSet": {"friends": payload["user_id"]}})
    
    return {"message": "Friend added via invite!", "friend_name": inviter["username"]}

# ==================== DIFFICULTY SYSTEM ====================

DIFFICULTY_MODIFIERS = {
    "easy": {
        "event_positive_chance": 0.65,
        "investment_cost_modifier": 0.7,
        "tax_modifier": 0.5,
        "starting_cash_bonus": 1.5,
        "trivia_reward_modifier": 1.3,
        "negative_event_modifier": 0.6,
    },
    "medium": {
        "event_positive_chance": 0.5,
        "investment_cost_modifier": 1.0,
        "tax_modifier": 1.0,
        "starting_cash_bonus": 1.0,
        "trivia_reward_modifier": 1.0,
        "negative_event_modifier": 1.0,
    },
    "hard": {
        "event_positive_chance": 0.35,
        "investment_cost_modifier": 1.3,
        "tax_modifier": 1.5,
        "starting_cash_bonus": 0.7,
        "trivia_reward_modifier": 0.8,
        "negative_event_modifier": 1.4,
    },
}

@api_router.get("/game/difficulty")
async def get_difficulty_options():
    return {"difficulties": DIFFICULTY_MODIFIERS}

# ==================== GAME CONTENT ROUTES ====================

@api_router.get("/game/professions")
async def get_professions():
    return {"professions": list(PROFESSIONS.values())}

@api_router.get("/game/board")
async def get_board():
    return {"tiles": BOARD_TILES, "total_tiles": len(BOARD_TILES)}

@api_router.get("/game/content")
async def get_game_content():
    return {
        "events": EVENTS,
        "trivia": TRIVIA_QUESTIONS,
        "investments": INVESTMENTS,
        "market_events": MARKET_EVENTS,
        "opportunities": OPPORTUNITIES,
        "tax_events": TAX_EVENTS,
        "achievements": ACHIEVEMENTS_DEF,
    }

# ==================== SAVE/LOAD ====================

@api_router.post("/game/save")
async def save_game(req: SaveGameRequest, token: str = ""):
    user_id = "anonymous"
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload["user_id"]
    
    save_id = str(uuid.uuid4())
    save_doc = {
        "id": save_id,
        "user_id": user_id,
        "slot_name": req.slot_name,
        "game_state": req.game_state,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Upsert by user + slot name
    await db.saves.update_one(
        {"user_id": user_id, "slot_name": req.slot_name},
        {"$set": save_doc},
        upsert=True
    )
    
    return {"message": "Game saved", "save_id": save_id}

@api_router.get("/game/saves")
async def get_saves(token: str = ""):
    user_id = "anonymous"
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload["user_id"]
    
    saves = await db.saves.find({"user_id": user_id}, {"_id": 0}).sort("updated_at", -1).to_list(20)
    return {"saves": [serialize_doc(s) for s in saves]}

@api_router.delete("/game/saves/{save_id}")
async def delete_save(save_id: str, token: str = ""):
    user_id = "anonymous"
    if token:
        payload = verify_token(token)
        if payload:
            user_id = payload["user_id"]
    
    await db.saves.delete_one({"id": save_id, "user_id": user_id})
    return {"message": "Save deleted"}

# ==================== FRIENDS ====================

@api_router.post("/friends/request")
async def send_friend_request(data: dict):
    token = data.get("token", "")
    target_username = data.get("username", "")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    me = await db.users.find_one({"id": payload["user_id"]})
    target = await db.users.find_one({"username": target_username})
    
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["id"] == me["id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    if target["id"] in me.get("friends", []):
        raise HTTPException(status_code=400, detail="Already friends")
    if me["id"] in target.get("friend_requests", []):
        raise HTTPException(status_code=400, detail="Request already sent")
    
    await db.users.update_one({"id": target["id"]}, {"$addToSet": {"friend_requests": me["id"]}})
    return {"message": "Friend request sent"}

@api_router.post("/friends/accept")
async def accept_friend(data: dict):
    token = data.get("token", "")
    requester_id = data.get("user_id", "")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.users.update_one({"id": payload["user_id"]}, {
        "$addToSet": {"friends": requester_id},
        "$pull": {"friend_requests": requester_id}
    })
    await db.users.update_one({"id": requester_id}, {"$addToSet": {"friends": payload["user_id"]}})
    return {"message": "Friend added"}

@api_router.post("/friends/reject")
async def reject_friend(data: dict):
    token = data.get("token", "")
    requester_id = data.get("user_id", "")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.users.update_one({"id": payload["user_id"]}, {"$pull": {"friend_requests": requester_id}})
    return {"message": "Friend request rejected"}

@api_router.post("/friends/remove")
async def remove_friend(data: dict):
    token = data.get("token", "")
    friend_id = data.get("user_id", "")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.users.update_one({"id": payload["user_id"]}, {"$pull": {"friends": friend_id}})
    await db.users.update_one({"id": friend_id}, {"$pull": {"friends": payload["user_id"]}})
    return {"message": "Friend removed"}

@api_router.get("/friends/list")
async def get_friends(token: str = ""):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload["user_id"]})
    friends = []
    for fid in user.get("friends", []):
        friend = await db.users.find_one({"id": fid})
        if friend:
            friends.append({
                "id": friend["id"],
                "username": friend["username"],
                "avatar_color": friend.get("avatar_color", "#FFD700"),
                "avatar_url": friend.get("avatar_url", ""),
                "is_online": friend.get("is_online", False),
                "games_won": friend.get("games_won", 0),
            })
    
    requests = []
    for rid in user.get("friend_requests", []):
        req_user = await db.users.find_one({"id": rid})
        if req_user:
            requests.append({
                "id": req_user["id"],
                "username": req_user["username"],
                "avatar_color": req_user.get("avatar_color", "#FFD700"),
            })
    
    return {"friends": friends, "requests": requests}

# ==================== LEADERBOARD ====================

@api_router.get("/leaderboard")
async def get_leaderboard():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("games_won", -1).to_list(50)
    leaderboard = []
    for u in users:
        if u.get("games_played", 0) > 0:
            leaderboard.append({
                "username": u["username"],
                "avatar_color": u.get("avatar_color", "#FFD700"),
                "games_won": u.get("games_won", 0),
                "games_played": u.get("games_played", 0),
                "best_score": u.get("best_score", 0),
            })
    return {"leaderboard": leaderboard}

@api_router.get("/achievements")
async def get_achievements():
    return {"achievements": ACHIEVEMENTS_DEF}

# ==================== CHALLENGES ====================

@api_router.post("/challenges/send")
async def send_challenge(data: dict):
    token = data.get("token", "")
    friend_id = data.get("friend_id", "")
    room_code = data.get("room_code", "")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    me = await db.users.find_one({"id": payload["user_id"]})
    
    challenge = {
        "id": str(uuid.uuid4()),
        "from_id": payload["user_id"],
        "from_name": me.get("username", "Player"),
        "to_id": friend_id,
        "room_code": room_code,
        "status": "pending",  # pending, accepted, rejected, expired
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.challenges.insert_one(challenge)
    return {"message": "Challenge sent", "challenge_id": challenge["id"]}

@api_router.get("/challenges/pending")
async def get_pending_challenges(token: str = ""):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    challenges = await db.challenges.find(
        {"to_id": payload["user_id"], "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return {"challenges": [serialize_doc(c) for c in challenges]}

@api_router.post("/challenges/respond")
async def respond_challenge(data: dict):
    token = data.get("token", "")
    challenge_id = data.get("challenge_id", "")
    accept = data.get("accept", False)
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    status = "accepted" if accept else "rejected"
    await db.challenges.update_one({"id": challenge_id}, {"$set": {"status": status}})
    
    if accept:
        challenge = await db.challenges.find_one({"id": challenge_id})
        if challenge:
            return {"message": "Challenge accepted", "room_code": challenge.get("room_code", "")}
    
    return {"message": f"Challenge {status}"}

# ==================== STATS UPDATE ====================

@api_router.post("/game/complete")
async def complete_game(data: dict):
    token = data.get("token", "")
    won = data.get("won", False)
    score = data.get("score", 0)
    turns = data.get("turns", 0)
    net_worth = data.get("net_worth", 0)
    new_achievements = data.get("achievements", [])
    
    payload = verify_token(token)
    if not payload:
        return {"message": "Game completed (anonymous)"}
    
    update = {
        "$inc": {"games_played": 1},
    }
    if won:
        update["$inc"]["games_won"] = 1
    
    user = await db.users.find_one({"id": payload["user_id"]})
    if score > user.get("best_score", 0):
        update["$set"] = {"best_score": score}
    if net_worth > user.get("total_net_worth", 0):
        update.setdefault("$set", {})["total_net_worth"] = net_worth
    
    if new_achievements:
        update["$addToSet"] = {"achievements": {"$each": new_achievements}}
    
    await db.users.update_one({"id": payload["user_id"]}, update)
    return {"message": "Stats updated"}

# ==================== WEBSOCKET MULTIPLAYER ====================

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Dict] = {}  # room_code -> room state
        self.connections: Dict[str, Dict[str, WebSocket]] = {}  # room_code -> {user_id: ws}
        self.user_rooms: Dict[str, str] = {}  # user_id -> room_code
        self.turn_timers: Dict[str, asyncio.Task] = {}  # room_code -> timer task
        self.afk_strikes: Dict[str, Dict[str, int]] = {}  # room_code -> {user_id: strike_count}
    
    async def create_room(self, host_id: str, host_name: str, host_color: str, host_avatar: str = "") -> str:
        code = generate_room_code()
        while code in self.rooms:
            code = generate_room_code()
        
        self.rooms[code] = {
            "code": code,
            "host_id": host_id,
            "status": "waiting",  # waiting, playing, finished
            "players": [{
                "id": host_id,
                "name": host_name,
                "color": host_color,
                "avatar_url": host_avatar,
                "ready": False,
            }],
            "game_state": None,
            "max_players": 6,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "chat_messages": [],
        }
        self.connections[code] = {}
        return code
    
    async def join_room(self, code: str, user_id: str, user_name: str, user_color: str, avatar_url: str = "") -> bool:
        if code not in self.rooms:
            return False
        room = self.rooms[code]
        if room["status"] != "waiting":
            return False
        if len(room["players"]) >= room["max_players"]:
            return False
        # Check if already in room - update info instead of duplicating
        for p in room["players"]:
            if p["id"] == user_id:
                p["name"] = user_name
                p["color"] = user_color
                p["avatar_url"] = avatar_url
                return True
        
        room["players"].append({
            "id": user_id,
            "name": user_name,
            "color": user_color,
            "avatar_url": avatar_url,
            "ready": False,
        })
        self.user_rooms[user_id] = code
        return True
    
    async def connect(self, code: str, user_id: str, ws: WebSocket):
        if code not in self.connections:
            self.connections[code] = {}
        # Close old connection if user reconnects
        old_ws = self.connections[code].get(user_id)
        if old_ws:
            try:
                await old_ws.close()
            except Exception:
                pass
        self.connections[code][user_id] = ws
        self.user_rooms[user_id] = code
    
    async def disconnect(self, user_id: str):
        code = self.user_rooms.get(user_id)
        if code and code in self.connections:
            self.connections[code].pop(user_id, None)
            # Notify others
            await self.broadcast(code, {
                "type": "player_disconnected",
                "user_id": user_id,
            })
    
    async def broadcast(self, code: str, message: dict, exclude: str = None):
        if code not in self.connections:
            return
        for uid, ws in list(self.connections[code].items()):
            if uid != exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass
    
    async def send_to(self, code: str, user_id: str, message: dict):
        if code in self.connections and user_id in self.connections[code]:
            try:
                await self.connections[code][user_id].send_json(message)
            except Exception:
                pass
    
    def get_room(self, code: str):
        return self.rooms.get(code)
    
    def cancel_turn_timer(self, code: str):
        """Cancel any existing turn timer for a room."""
        task = self.turn_timers.pop(code, None)
        if task and not task.done():
            task.cancel()
    
    async def start_resolve_timer(self, code: str, player_id: str):
        """Start a 20-second timer - if player doesn't resolve event, auto-skip."""
        self.cancel_turn_timer(code)
        self.turn_timers[code] = asyncio.create_task(self._resolve_timer_task(code, player_id))
    
    async def _resolve_timer_task(self, code: str, player_id: str):
        """After 20 seconds, auto-skip the event and advance turn."""
        try:
            await asyncio.sleep(20)
            room = self.get_room(code)
            if not room or room["status"] != "playing" or not room.get("game_state"):
                return
            gs = room["game_state"]
            if gs["phase"] != "resolve" or gs["current_turn"] != player_id:
                return
            
            # Auto-skip: advance to next turn
            gs["turn_index"] = (gs["turn_index"] + 1) % len(gs["turn_order"])
            gs["current_turn"] = gs["turn_order"][gs["turn_index"]]
            gs["phase"] = "roll"
            
            player_name = gs["players"].get(player_id, {}).get("name", "Player")
            await self.broadcast(code, {
                "type": "bot_activated",
                "user_id": player_id,
                "player_name": player_name,
                "strikes": 0,
                "message_es": f"Turno de {player_name} saltado por inactividad",
                "message_en": f"{player_name}'s turn skipped due to inactivity",
            })
            await self.broadcast(code, {
                "type": "turn_resolved",
                "game_state": gs,
            })
            await self.start_turn_timer(code)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Resolve timer error: {e}")
    
    async def start_turn_timer(self, code: str):
        """Start a 15-second auto-roll timer for the current player's turn."""
        self.cancel_turn_timer(code)
        self.turn_timers[code] = asyncio.create_task(self._turn_timer_task(code))
    
    async def _turn_timer_task(self, code: str):
        """After 15 seconds, auto-roll for the current player (bot activation).
        Bot plays for up to 300 seconds (20 auto-rolls at 15s each) before kicking."""
        try:
            await asyncio.sleep(15)
            room = self.get_room(code)
            if not room or room["status"] != "playing" or not room.get("game_state"):
                return
            gs = room["game_state"]
            if gs["phase"] != "roll":
                return
            
            current_player_id = gs["current_turn"]
            
            # Initialize strikes tracking
            if code not in self.afk_strikes:
                self.afk_strikes[code] = {}
            self.afk_strikes[code].setdefault(current_player_id, 0)
            self.afk_strikes[code][current_player_id] += 1
            strikes = self.afk_strikes[code][current_player_id]
            player_name = gs["players"].get(current_player_id, {}).get("name", "Player")
            max_bot_rolls = 20  # 20 x 15s = 300 seconds of bot play
            
            if strikes > max_bot_rolls:
                # Over 300 seconds AFK = kick player from game
                await self._kick_player(code, current_player_id, player_name)
                return
            
            # Auto-roll (bot mode) - announce it
            remaining_secs = (max_bot_rolls - strikes) * 15
            await self.broadcast(code, {
                "type": "bot_activated",
                "user_id": current_player_id,
                "player_name": player_name,
                "strikes": strikes,
                "max_strikes": max_bot_rolls,
                "remaining_seconds": remaining_secs,
                "message_es": f"Bot jugando por {player_name} ({remaining_secs}s restantes)",
                "message_en": f"Bot playing for {player_name} ({remaining_secs}s remaining)",
            })
            
            # Perform the auto-roll
            await self._auto_roll(code, current_player_id)
            
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Turn timer error for room {code}: {e}")
    
    async def _auto_roll(self, code: str, player_id: str):
        """Automatically roll dice for a player (bot mode)."""
        room = self.get_room(code)
        if not room or not room.get("game_state"):
            return
        gs = room["game_state"]
        if gs["current_turn"] != player_id or gs["phase"] != "roll":
            return
        
        dice1 = random.randint(1, 6)
        dice2 = random.randint(1, 6)
        total = dice1 + dice2
        gs["last_dice"] = [dice1, dice2]
        
        player = gs["players"].get(player_id)
        if not player:
            return
        old_pos = player["position"]
        new_pos = (old_pos + total) % 24
        passed_payday = new_pos < old_pos or (old_pos == 0 and total >= 24)
        player["position"] = new_pos
        
        if passed_payday:
            payday_amount = player["salary"] - player["expenses"] + player["passive_income"]
            player["cash"] += payday_amount
            player["month"] += 1
        
        # For bot auto-rolls, skip tile events - just advance turn
        # Move to next turn directly
        self._advance_turn(gs)
        
        await self.broadcast(code, {
            "type": "dice_rolled",
            "user_id": player_id,
            "dice": [dice1, dice2],
            "new_position": new_pos,
            "passed_payday": passed_payday,
            "payday_amount": player["salary"] - player["expenses"] + player["passive_income"] if passed_payday else 0,
            "tile": BOARD_TILES[new_pos],
            "tile_event": None,  # Bot skips events
            "game_state": gs,
            "is_bot_roll": True,
        })
        
        # Also send turn_resolved immediately since bot doesn't resolve events
        await self.broadcast(code, {
            "type": "turn_resolved",
            "game_state": gs,
        })
        
        # Start timer for next player
        await self.start_turn_timer(code)
    
    def _advance_turn(self, gs: dict):
        """Move to the next player's turn, skipping kicked players."""
        turn_order = gs["turn_order"]
        if not turn_order:
            return
        gs["turn_index"] = (gs["turn_index"] + 1) % len(turn_order)
        gs["current_turn"] = turn_order[gs["turn_index"]]
        gs["phase"] = "roll"
    
    async def _kick_player(self, code: str, player_id: str, player_name: str):
        """Kick a player from the game due to AFK. Game continues for remaining players."""
        room = self.get_room(code)
        if not room or not room.get("game_state"):
            return
        gs = room["game_state"]
        
        # Remove player from turn order
        if player_id in gs["turn_order"]:
            was_current = gs["current_turn"] == player_id
            gs["turn_order"].remove(player_id)
            
            # If only 1 player left, they win
            if len(gs["turn_order"]) <= 1:
                if gs["turn_order"]:
                    winner_id = gs["turn_order"][0]
                    gs["players"][winner_id]["has_won"] = True
                    gs["phase"] = "game_over"
                    await self.broadcast(code, {
                        "type": "player_kicked",
                        "kicked_id": player_id,
                        "kicked_name": player_name,
                        "message_es": f"{player_name} ha sido expulsado por inactividad",
                        "message_en": f"{player_name} was kicked for inactivity",
                    })
                    await self.broadcast(code, {
                        "type": "game_over",
                        "winner": winner_id,
                        "game_state": gs,
                    })
                    self.cancel_turn_timer(code)
                return
            
            # Fix turn index after removal
            if was_current:
                gs["turn_index"] = gs["turn_index"] % len(gs["turn_order"])
                gs["current_turn"] = gs["turn_order"][gs["turn_index"]]
                gs["phase"] = "roll"
            else:
                # Recalculate turn_index to still point to the same player
                try:
                    gs["turn_index"] = gs["turn_order"].index(gs["current_turn"])
                except ValueError:
                    gs["turn_index"] = 0
                    gs["current_turn"] = gs["turn_order"][0]
            
            # Mark player as kicked in their state (but keep data for stats)
            if player_id in gs["players"]:
                gs["players"][player_id]["kicked"] = True
        
        # Notify all players
        await self.broadcast(code, {
            "type": "player_kicked",
            "kicked_id": player_id,
            "kicked_name": player_name,
            "message_es": f"{player_name} ha sido expulsado por inactividad. La partida continua.",
            "message_en": f"{player_name} was kicked for inactivity. The game continues.",
        })
        
        await self.broadcast(code, {
            "type": "turn_resolved",
            "game_state": gs,
        })
        
        # Start timer for next player
        await self.start_turn_timer(code)
    
    def init_game_state(self, code: str, profession_choices: Dict[str, str]):
        room = self.rooms[code]
        players_state = {}
        for p in room["players"]:
            prof_id = profession_choices.get(p["id"], "engineer")
            prof = PROFESSIONS.get(prof_id, PROFESSIONS["engineer"])
            players_state[p["id"]] = {
                "id": p["id"],
                "name": p["name"],
                "color": p["color"],
                "avatar_url": p.get("avatar_url", ""),
                "profession_id": prof_id,
                "position": 0,
                "cash": prof["starting_cash"],
                "salary": prof["salary"],
                "expenses": prof["expenses"],
                "passive_income": 0,
                "assets": [],
                "month": 1,
                "net_worth": prof["starting_cash"],
                "trivia_streak": 0,
                "negative_events": 0,
                "has_won": False,
            }
        
        room["game_state"] = {
            "players": players_state,
            "current_turn": room["players"][0]["id"],
            "turn_order": [p["id"] for p in room["players"]],
            "turn_index": 0,
            "phase": "roll",  # roll, resolve, end_turn
            "last_dice": [0, 0],
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        room["status"] = "playing"
        # Initialize AFK tracking
        self.afk_strikes[code] = {p["id"]: 0 for p in room["players"]}
        return room["game_state"]

manager = ConnectionManager()

@app.websocket("/api/ws/{room_code}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, user_id: str):
    ws_user = await db.users.find_one({"id": user_id})
    if not ws_user:
        await websocket.close(code=4404, reason="User not found")
        return
    has_license = await sync_user_license(user_id, ws_user.get("email", ""))
    if not has_license:
        await websocket.close(code=4403, reason="License required")
        return
    await websocket.accept()
    await manager.connect(room_code, user_id, websocket)
    
    # Send current room state
    room = manager.get_room(room_code)
    if room:
        await websocket.send_json({
            "type": "room_state",
            "room": {
                "code": room["code"],
                "host_id": room["host_id"],
                "status": room["status"],
                "players": room["players"],
                "game_state": room["game_state"],
                "chat_messages": room.get("chat_messages", [])[-50:],
            }
        })
        # Notify others
        await manager.broadcast(room_code, {
            "type": "player_connected",
            "user_id": user_id,
        }, exclude=user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")
            
            if msg_type == "chat":
                chat_msg = {
                    "user_id": user_id,
                    "username": data.get("username", "Player"),
                    "message": data.get("message", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                if room_code in manager.rooms:
                    manager.rooms[room_code].setdefault("chat_messages", []).append(chat_msg)
                await manager.broadcast(room_code, {"type": "chat", "message": chat_msg})
            
            elif msg_type == "reaction":
                # Emoji reaction broadcast
                await manager.broadcast(room_code, {
                    "type": "reaction",
                    "user_id": user_id,
                    "username": data.get("username", "Player"),
                    "emoji": data.get("emoji", "👍"),
                })
            
            elif msg_type == "ready":
                room = manager.get_room(room_code)
                if room:
                    for p in room["players"]:
                        if p["id"] == user_id:
                            p["ready"] = data.get("ready", True)
                            if data.get("profession"):
                                p["profession"] = data["profession"]
                    
                    # Auto-start: if all players ready and >= 2 players
                    all_ready = len(room["players"]) >= 2 and all(p.get("ready") for p in room["players"])
                    
                    await manager.broadcast(room_code, {"type": "room_state", "room": {
                        "code": room["code"], "host_id": room["host_id"],
                        "status": room["status"], "players": room["players"],
                        "game_state": room["game_state"],
                        "chat_messages": room.get("chat_messages", [])[-50:],
                    }})
                    
                    # Auto-start game when everyone is ready
                    if all_ready and room["status"] == "waiting":
                        profession_choices = {p["id"]: p.get("profession", "engineer") for p in room["players"]}
                        game_state = manager.init_game_state(room_code, profession_choices)
                        await manager.broadcast(room_code, {
                            "type": "game_started",
                            "game_state": game_state,
                        })
                        await manager.start_turn_timer(room_code)
            
            elif msg_type == "start_game":
                room = manager.get_room(room_code)
                if room and room["host_id"] == user_id:
                    profession_choices = data.get("professions", {})
                    game_state = manager.init_game_state(room_code, profession_choices)
                    await manager.broadcast(room_code, {
                        "type": "game_started",
                        "game_state": game_state,
                    })
                    # Start the first turn timer
                    await manager.start_turn_timer(room_code)
            
            elif msg_type == "roll_dice":
                room = manager.get_room(room_code)
                if room and room["game_state"]:
                    gs = room["game_state"]
                    if gs["current_turn"] == user_id and gs["phase"] == "roll":
                        # Reset AFK strikes for this player (they're active)
                        if room_code in manager.afk_strikes:
                            manager.afk_strikes[room_code][user_id] = 0
                        manager.cancel_turn_timer(room_code)
                        
                        dice1 = random.randint(1, 6)
                        dice2 = random.randint(1, 6)
                        total = dice1 + dice2
                        gs["last_dice"] = [dice1, dice2]
                        
                        player = gs["players"][user_id]
                        old_pos = player["position"]
                        new_pos = (old_pos + total) % 24
                        passed_payday = new_pos < old_pos or (old_pos == 0 and total >= 24)
                        player["position"] = new_pos
                        
                        payday_amount = 0
                        if passed_payday:
                            payday_amount = player["salary"] - player["expenses"] + player["passive_income"]
                            player["cash"] += payday_amount
                            player["month"] += 1
                        
                        gs["phase"] = "resolve"
                        
                        tile = BOARD_TILES[new_pos]
                        tile_event = None
                        
                        if tile["type"] == "event":
                            tile_event = random.choice(EVENTS)
                        elif tile["type"] == "trivia":
                            tile_event = random.choice(TRIVIA_QUESTIONS)
                            tile_event["_card_type"] = "trivia"
                        elif tile["type"] in ["investment", "real_estate"]:
                            tile_event = random.choice(INVESTMENTS)
                            tile_event["_card_type"] = "investment"
                        elif tile["type"] == "market":
                            tile_event = random.choice(MARKET_EVENTS)
                            tile_event["_card_type"] = "market"
                        elif tile["type"] == "opportunity":
                            tile_event = random.choice(OPPORTUNITIES)
                            tile_event["_card_type"] = "opportunity"
                        elif tile["type"] == "tax":
                            tile_event = random.choice(TAX_EVENTS)
                            tile_event["_card_type"] = "tax"
                        elif tile["type"] == "payday":
                            tile_event = {"_card_type": "payday_bonus", "amount": 500}
                        
                        await manager.broadcast(room_code, {
                            "type": "dice_rolled",
                            "user_id": user_id,
                            "dice": [dice1, dice2],
                            "new_position": new_pos,
                            "passed_payday": passed_payday,
                            "payday_amount": payday_amount,
                            "tile": tile,
                            "tile_event": tile_event,
                            "game_state": gs,
                        })
                        
                        # If no tile event (e.g. payday tile), auto-advance turn
                        if tile_event is None or tile["type"] == "payday":
                            # Apply payday bonus
                            if tile["type"] == "payday":
                                player["cash"] += 500
                            # Advance to next turn
                            gs["turn_index"] = (gs["turn_index"] + 1) % len(gs["turn_order"])
                            gs["current_turn"] = gs["turn_order"][gs["turn_index"]]
                            gs["phase"] = "roll"
                            await manager.broadcast(room_code, {
                                "type": "turn_resolved",
                                "game_state": gs,
                            })
                            await manager.start_turn_timer(room_code)
                        else:
                            # Start a 20-second resolve timeout
                            await manager.start_resolve_timer(room_code, user_id)
            
            elif msg_type == "resolve_turn":
                room = manager.get_room(room_code)
                if room and room["game_state"]:
                    gs = room["game_state"]
                    if gs["current_turn"] == user_id:
                        # Cancel resolve timeout since player responded
                        manager.cancel_turn_timer(room_code)
                        
                        action = data.get("action", {})
                        player = gs["players"][user_id]
                        
                        action_type = action.get("type", "")
                        if action_type == "event_resolved":
                            amount = action.get("amount", 0)
                            player["cash"] += amount
                            if amount < 0:
                                player["negative_events"] = player.get("negative_events", 0) + 1
                        
                        elif action_type == "trivia_answered":
                            correct = action.get("correct", False)
                            reward = action.get("reward", 0)
                            if correct:
                                player["cash"] += reward
                                player["trivia_streak"] = player.get("trivia_streak", 0) + 1
                            else:
                                player["trivia_streak"] = 0
                        
                        elif action_type == "trivia_correct":
                            reward = action.get("reward", 0)
                            player["cash"] += reward
                            player["trivia_streak"] = player.get("trivia_streak", 0) + 1
                        
                        elif action_type == "trivia_incorrect":
                            player["trivia_streak"] = 0
                        
                        elif action_type == "investment_bought":
                            inv = action.get("investment", {})
                            cost = action.get("cost", inv.get("down_payment", inv.get("cost", 0)))
                            income = action.get("income", inv.get("monthly_income", 0))
                            if player["cash"] >= cost:
                                player["cash"] -= cost
                                player["assets"].append({
                                    "name": inv.get("name", {"es": "Activo", "en": "Asset"}),
                                    "cost": inv.get("cost", cost),
                                    "down_payment": cost,
                                    "monthly_income": income,
                                    "type": inv.get("type", "investment"),
                                })
                                player["passive_income"] += income
                        
                        elif action_type == "sell_and_buy":
                            sold_indices = action.get("soldIndices", [])
                            inv = action.get("investment", {})
                            cost = action.get("cost", 0)
                            income = action.get("income", inv.get("monthly_income", 0))
                            
                            # Sell assets (reverse order to keep indices correct)
                            for idx in sorted(sold_indices, reverse=True):
                                if 0 <= idx < len(player["assets"]):
                                    sold_asset = player["assets"].pop(idx)
                                    sale_price = int(sold_asset.get("cost", sold_asset.get("down_payment", 5000)) * 0.8)
                                    player["cash"] += sale_price
                                    player["passive_income"] = max(0, player["passive_income"] - sold_asset.get("monthly_income", 0))
                            
                            # Buy the new investment
                            if player["cash"] >= cost:
                                player["cash"] -= cost
                                player["assets"].append({
                                    "name": inv.get("name", {"es": "Activo", "en": "Asset"}),
                                    "cost": inv.get("cost", cost),
                                    "down_payment": cost,
                                    "monthly_income": income,
                                    "type": inv.get("type", "investment"),
                                })
                                player["passive_income"] += income
                            
                            # Ensure passive_income never negative
                            player["passive_income"] = max(0, player["passive_income"])
                        
                        elif action_type == "investment_skipped" or action_type == "skip":
                            pass  # Just skip
                        
                        elif action_type == "opportunity_taken":
                            opp = action.get("opportunity", action.get("investment", {}))
                            cost = action.get("cost", opp.get("cost", 0))
                            income = action.get("income", opp.get("monthly_income", 0))
                            if player["cash"] >= cost:
                                player["cash"] -= cost
                                player["assets"].append({
                                    "name": opp.get("name", opp.get("title", {"es": "Oportunidad", "en": "Opportunity"})),
                                    "cost": cost,
                                    "down_payment": cost,
                                    "monthly_income": income,
                                    "type": "opportunity",
                                })
                                player["passive_income"] += income
                        
                        elif action_type == "tax_paid":
                            percentage = action.get("percentage", 10)
                            tax = int(player["cash"] * percentage / 100)
                            player["cash"] -= tax
                        
                        elif action_type == "market_resolved":
                            pass  # Market events affect all, handled client-side
                        
                        elif action_type == "payday_collected":
                            pass  # Already handled
                        
                        # Ensure values are never negative
                        player["passive_income"] = max(0, player.get("passive_income", 0))
                        if player["cash"] < 0:
                            player["cash"] = 0
                        
                        # Update net worth
                        asset_value = sum(a.get("cost", 0) for a in player["assets"])
                        player["net_worth"] = player["cash"] + asset_value
                        
                        # Check win condition
                        if player["passive_income"] >= player["expenses"]:
                            player["has_won"] = True
                            gs["phase"] = "game_over"
                            await manager.broadcast(room_code, {
                                "type": "game_over",
                                "winner": user_id,
                                "game_state": gs,
                            })
                        else:
                            # Next turn
                            gs["turn_index"] = (gs["turn_index"] + 1) % len(gs["turn_order"])
                            gs["current_turn"] = gs["turn_order"][gs["turn_index"]]
                            gs["phase"] = "roll"
                            
                            await manager.broadcast(room_code, {
                                "type": "turn_resolved",
                                "game_state": gs,
                            })
                            # Start turn timer for next player
                            await manager.start_turn_timer(room_code)
            
            elif msg_type == "leave_room":
                room = manager.get_room(room_code)
                if room:
                    if room["status"] == "playing" and room.get("game_state"):
                        gs = room["game_state"]
                        leaver_name = gs["players"].get(user_id, {}).get("name", "Player")
                        
                        # Remove from turn order
                        if user_id in gs["turn_order"]:
                            was_current = gs["current_turn"] == user_id
                            gs["turn_order"].remove(user_id)
                            
                            if len(gs["turn_order"]) <= 1 and gs["turn_order"]:
                                # Only 1 player left -> they win
                                winner_id = gs["turn_order"][0]
                                gs["players"][winner_id]["has_won"] = True
                                gs["phase"] = "game_over"
                                room["status"] = "finished"
                                manager.cancel_turn_timer(room_code)
                                
                                await manager.broadcast(room_code, {
                                    "type": "player_forfeited",
                                    "user_id": user_id,
                                    "leaver_name": leaver_name,
                                    "winner_id": winner_id,
                                    "game_state": gs,
                                })
                            elif len(gs["turn_order"]) > 1:
                                # Multiple players remain -> game continues
                                if was_current:
                                    gs["turn_index"] = gs["turn_index"] % len(gs["turn_order"])
                                    gs["current_turn"] = gs["turn_order"][gs["turn_index"]]
                                    gs["phase"] = "roll"
                                else:
                                    try:
                                        gs["turn_index"] = gs["turn_order"].index(gs["current_turn"])
                                    except ValueError:
                                        gs["turn_index"] = 0
                                        gs["current_turn"] = gs["turn_order"][0]
                                
                                if user_id in gs["players"]:
                                    gs["players"][user_id]["kicked"] = True
                                
                                await manager.broadcast(room_code, {
                                    "type": "player_left_game",
                                    "user_id": user_id,
                                    "leaver_name": leaver_name,
                                    "message_es": f"{leaver_name} ha abandonado. La partida continua.",
                                    "message_en": f"{leaver_name} left. The game continues.",
                                    "game_state": gs,
                                })
                                await manager.start_turn_timer(room_code)
                            else:
                                # No players left
                                room["status"] = "finished"
                                manager.cancel_turn_timer(room_code)
                        
                        # Remove from players list
                        room["players"] = [p for p in room["players"] if p["id"] != user_id]
                        if not room["players"]:
                            manager.cancel_turn_timer(room_code)
                            if room_code in manager.rooms:
                                del manager.rooms[room_code]
                    else:
                        # Lobby phase - just leave normally
                        room["players"] = [p for p in room["players"] if p["id"] != user_id]
                        if not room["players"]:
                            if room_code in manager.rooms:
                                del manager.rooms[room_code]
                        elif room["host_id"] == user_id and room["players"]:
                            room["host_id"] = room["players"][0]["id"]
                        await manager.broadcast(room_code, {
                            "type": "player_left",
                            "user_id": user_id,
                            "room": room if room_code in manager.rooms else None,
                        })
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        # Handle unexpected disconnect - DON'T immediately end game, just note disconnection
        room = manager.get_room(room_code)
        if room and room["status"] == "playing" and room.get("game_state"):
            gs = room["game_state"]
            # Just notify - the turn timer will handle AFK kicks
            # Don't end the game immediately on disconnect (player might reconnect)
            await manager.broadcast(room_code, {
                "type": "player_disconnected",
                "user_id": user_id,
                "player_name": gs["players"].get(user_id, {}).get("name", "Player"),
            }, exclude=user_id)
        await manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(user_id)

# Room management REST endpoints
@api_router.post("/rooms/create")
async def create_room(data: dict):
    token = data.get("token", "")
    user = await require_active_license_from_token(token)
    code = await manager.create_room(
        user["id"],
        user.get("username", "Player"),
        user.get("avatar_color", "#FFD700"),
        user.get("avatar_url", "")
    )
    
    # Store in DB for persistence
    await db.rooms.update_one({"code": code}, {"$set": {
        "code": code,
        "host_id": user["id"],
        "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }}, upsert=True)
    
    return {"code": code}

@api_router.post("/rooms/join")
async def join_room(data: dict):
    token = data.get("token", "")
    code = data.get("code", "").upper()

    user = await require_active_license_from_token(token)
    success = await manager.join_room(
        code,
        user["id"],
        user.get("username", "Player"),
        user.get("avatar_color", "#FFD700"),
        user.get("avatar_url", "")
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Cannot join room")
    
    return {"code": code, "joined": True}

@api_router.get("/rooms/active")
async def get_active_rooms():
    rooms = []
    for code, room in manager.rooms.items():
        if room["status"] == "waiting":
            rooms.append({
                "code": code,
                "host_id": room["host_id"],
                "player_count": len(room["players"]),
                "max_players": room["max_players"],
                "players": [{"name": p["name"], "color": p["color"]} for p in room["players"]],
            })
    return {"rooms": rooms}

# ==================== SETUP ====================

app.include_router(api_router)


# --- Diagnóstico móvil / red (sin React; prioridad sobre el mount estático) ---
@app.get("/_xamox_ping")
async def xamox_ping():
    """JSON mínimo: si el móvil abre esto, el Mac recibe tráfico en el puerto 8000."""
    return {"ok": True, "service": "xamox-backend"}


@app.get("/_xamox_ok.html", response_class=HTMLResponse)
async def xamox_ok_html():
    """Página HTML fija: si la ves en el móvil, WiFi/firewall están bien; el fallo sería del front/PWA."""
    return HTMLResponse(
        """<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Xamox — prueba</title>
<style>body{font-family:system-ui;background:#07151B;color:#EAF2F3;padding:1.5rem;max-width:28rem;margin:auto}
h1{color:#F7D77A;font-size:1.25rem}.ok{color:#39d98a}a{color:#F7D77A}</style></head><body>
<h1>Servidor Xamox OK</h1>
<p class="ok">Si lees esto en el móvil, el Mac <strong>sí</strong> recibe conexiones en el puerto 8000.</p>
<p>Si el juego en <a href="/">/</a> no carga, prueba en el móvil: borrar datos del sitio / recarga forzada, o abrir en ventana privada.</p>
<p><a href="/api/game/board">Probar API (JSON)</a></p>
</body></html>"""
    )


# CORS: no mezclar allow_credentials=True con origen "*" (Safari/iOS bloquea; el juego en LAN parece "backend caído").
# El front usa token en query/header, no cookies cross-site para la API de juego.
_cors_raw = (os.environ.get('CORS_ORIGINS') or '*').strip() or '*'
_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]
_use_regex = len(_origins) == 1 and _origins[0] == '*'
if _use_regex:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=False,
        allow_origin_regex=r"https?://.*",
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if MONGO_URL_WAS_DEFAULTED:
    logger.warning(
        "MONGO_URL no está definido en backend/.env — usando mongodb://127.0.0.1:27017. "
        "Si no tienes Mongo, deja que el script levante Docker o edita .env (p. ej. Atlas)."
    )

# SPA estática (mismo puerto que la API): evita CORS y problemas del dev server en móvil.
# Prioridad: rutas /api/* y WebSocket /api/ws/* ya están registradas antes que este mount.
FRONTEND_BUILD = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD.is_dir() and (FRONTEND_BUILD / "index.html").is_file():
    from starlette.responses import FileResponse
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD / "static")), name="static-assets")
    app.mount("/music", StaticFiles(directory=str(FRONTEND_BUILD / "music")), name="music")

    _index_html = str(FRONTEND_BUILD / "index.html")
    _spa_file_extensions = {'.png','.jpg','.ico','.svg','.js','.css','.json','.mp3','.webp','.woff2','.ttf','.txt','.html','.xml','.webmanifest'}

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        file = FRONTEND_BUILD / full_path
        if full_path and file.is_file():
            suffix = file.suffix.lower()
            if suffix in _spa_file_extensions:
                return FileResponse(str(file))
        return FileResponse(_index_html)

    logger.info("Sirviendo frontend desde %s (abre http://<tu-ip>:8000 en el móvil)", FRONTEND_BUILD)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
