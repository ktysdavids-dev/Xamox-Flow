import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const FT = {
  developed: { es: 'Desarrollado por', en: 'Developed by', pt: 'Desenvolvido por', fr: 'Developpe par', de: 'Entwickelt von', it: 'Sviluppato da', zh: '开发者' },
  music: { es: 'Musica Original', en: 'Original Music', pt: 'Musica Original', fr: 'Musique Originale', de: 'Originalmusik', it: 'Musica Originale', zh: '原创音乐' },
  rights: { es: 'Todos los derechos reservados', en: 'All rights reserved', pt: 'Todos os direitos reservados', fr: 'Tous droits reserves', de: 'Alle Rechte vorbehalten', it: 'Tutti i diritti riservati', zh: '版权所有' },
  privacy: { es: 'Politica de Privacidad', en: 'Privacy Policy', pt: 'Politica de Privacidade', fr: 'Politique de Confidentialite', de: 'Datenschutz', it: 'Privacy Policy', zh: '隐私政策' },
  terms: { es: 'Terminos de Uso', en: 'Terms of Use', pt: 'Termos de Uso', fr: 'Conditions d\'Utilisation', de: 'Nutzungsbedingungen', it: 'Termini di Utilizzo', zh: '使用条款' },
  credits: { es: 'Creditos', en: 'Credits', pt: 'Creditos', fr: 'Credits', de: 'Credits', it: 'Crediti', zh: '制作人员' },
  music_prod: { es: 'Produccion musical propia de DJ Alka, fundador y productor musical registrado', en: 'Original music production by DJ Alka, founder and registered music producer', pt: 'Producao musical propria de DJ Alka, fundador e produtor musical registrado', fr: 'Production musicale originale par DJ Alka, fondateur et producteur musical enregistre', de: 'Eigene Musikproduktion von DJ Alka, Grunder und registrierter Musikproduzent', it: 'Produzione musicale propria di DJ Alka, fondatore e produttore musicale registrato', zh: 'DJ Alka原创音乐制作，创始人及注册音乐制作人' },
};

export function Footer() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (key) => FT[key]?.[lang] || FT[key]?.en || key;
  const year = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto" data-testid="app-footer">
      {/* Separator */}
      <div style={{height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(247,215,122,0.2) 50%, transparent 100%)', margin: '0 auto', maxWidth: '600px'}} />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Company & Music Credits */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo-xamox.png" alt="Xamox Flow" style={{width: '28px', height: '28px', objectFit: 'contain'}} />
            <span style={{fontSize: '14px', fontWeight: '700', color: 'var(--gold)'}}>Xamox Flow</span>
          </div>
          <p style={{fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '8px'}}>
            {t('developed')}{' '}
            <a href="https://www.ktysdavids.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--gold)', fontWeight: '600', textDecoration: 'none'}} data-testid="footer-company-link">
              Ktys & Davids Productions SL
            </a>
          </p>
          
          {/* Music Credit */}
          <div style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(247,215,122,0.06)', border: '1px solid rgba(247,215,122,0.1)', marginBottom: '8px'}}>
            <span style={{fontSize: '14px'}}>🎵</span>
            <span style={{fontSize: '11px', color: 'var(--text-muted)'}}>
              {t('music')}: <a href="https://www.dj-alka.com" target="_blank" rel="noopener noreferrer" style={{color: 'var(--gold)', fontWeight: '600', textDecoration: 'none'}} data-testid="footer-djalka-link">DJ Alka</a>
            </span>
          </div>
          <p style={{fontSize: '10px', color: 'var(--text-subtle)', lineHeight: '1.5', maxWidth: '360px', margin: '0 auto'}}>
            {t('music_prod')}
          </p>
        </div>

        {/* Legal Links */}
        <div className="flex items-center justify-center gap-4 mb-4" style={{flexWrap: 'wrap'}}>
          <button onClick={() => navigate('/privacy')} style={{fontSize: '11px', color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: '3px'}} data-testid="footer-privacy-link">
            {t('privacy')}
          </button>
          <span style={{color: 'rgba(255,255,255,0.1)', fontSize: '10px'}}>|</span>
          <button onClick={() => navigate('/terms')} style={{fontSize: '11px', color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: '3px'}} data-testid="footer-terms-link">
            {t('terms')}
          </button>
          <span style={{color: 'rgba(255,255,255,0.1)', fontSize: '10px'}}>|</span>
          <button onClick={() => navigate('/credits')} style={{fontSize: '11px', color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: '3px'}} data-testid="footer-credits-link">
            {t('credits')}
          </button>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p style={{fontSize: '10px', color: 'var(--text-subtle)', opacity: 0.6}}>
            &copy; {year} Ktys & Davids Productions SL. {t('rights')}.
          </p>
        </div>
      </div>
    </footer>
  );
}
