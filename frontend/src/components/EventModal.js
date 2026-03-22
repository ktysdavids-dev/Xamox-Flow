import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAudio } from '../contexts/AudioContext';

export default function EventModal({ event, playerCash, playerAssets = [], onResolve }) {
  const { t, tContent, lang } = useLanguage();
  const { playSfx } = useAudio();
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [showSellPanel, setShowSellPanel] = useState(false);
  const [selectedToSell, setSelectedToSell] = useState([]);

  if (!event) return null;

  const { type, data } = event;

  const handleTriviaAnswer = (idx) => {
    if (answered) return;
    setSelectedAnswer(idx);
    setAnswered(true);
    const correct = idx === data.correct;
    if (correct) {
      playSfx('success');
      setTimeout(() => onResolve({ type: 'trivia_correct', reward: data.reward }), 1200);
    } else {
      playSfx('error');
      setTimeout(() => onResolve({ type: 'trivia_incorrect' }), 1200);
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'event':
        const isPositive = data.type === 'positive';
        return (
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 ${isPositive ? 'bg-[rgba(57,217,138,0.15)]' : 'bg-[rgba(255,90,106,0.15)]'}`}>
              {isPositive ? '⭐' : '⚡'}
            </div>
            <h3 className="text-xl font-bold mb-1">{tContent(data.title)}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">{tContent(data.description)}</p>
            <div className={`text-2xl font-bold mb-6 tabular-nums ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {data.amount > 0 ? '+' : ''}${data.amount.toLocaleString()}
            </div>
            <button
              onClick={() => onResolve({ type: 'event_resolved', amount: data.amount })}
              className={`w-full py-3 rounded-xl font-bold ${isPositive ? 'btn-gold' : 'bg-[var(--danger)] text-white hover:brightness-110'}`}
              data-testid="event-resolve-btn"
            >
              {t('continue_game')}
            </button>
          </div>
        );

      case 'trivia':
        const options = data.options?.[lang] || data.options?.['en'] || data.options?.['es'] || [];
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 bg-[var(--tile-trivia-bg)]">
              ❓
            </div>
            <h3 className="text-lg font-bold mb-1">{t('trivia_question')}</h3>
            <p className="text-sm text-[var(--gold)] mb-3">{t('reward')}: ${data.reward}</p>
            <p className="text-base font-medium mb-4">{tContent(data.question)}</p>
            <div className="space-y-2 text-left">
              {options.map((opt, i) => {
                let btnClass = 'w-full p-3 rounded-xl text-sm text-left border transition-all ';
                if (answered) {
                  if (i === data.correct) btnClass += 'bg-[rgba(57,217,138,0.15)] border-[var(--success)] text-[var(--success)]';
                  else if (i === selectedAnswer) btnClass += 'bg-[rgba(255,90,106,0.15)] border-[var(--danger)] text-[var(--danger)]';
                  else btnClass += 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-subtle)] opacity-50';
                } else {
                  btnClass += 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--gold)] hover:bg-[rgba(247,215,122,0.05)] cursor-pointer';
                }
                return (
                  <button key={i} onClick={() => handleTriviaAnswer(i)} className={btnClass} data-testid={`trivia-option-${i}`}>
                    <span className="font-bold text-[var(--text-subtle)] mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className={`mt-4 p-3 rounded-xl text-sm font-bold animate-fade-in ${
                selectedAnswer === data.correct ? 'bg-[rgba(57,217,138,0.15)] text-[var(--success)]' : 'bg-[rgba(255,90,106,0.15)] text-[var(--danger)]'
              }`}>
                {selectedAnswer === data.correct ? `${t('correct')} +$${data.reward}` : t('incorrect')}
              </div>
            )}
          </div>
        );

      case 'investment':
        const cost = data.down_payment || data.cost;
        const canAfford = playerCash >= cost;
        const hasAssets = playerAssets && playerAssets.length > 0;
        // Calculate total available if we sell selected assets
        const sellValue = selectedToSell.reduce((sum, idx) => {
          const a = (playerAssets || [])[idx];
          return sum + (a ? Math.floor((a.cost || a.down_payment || 5000) * 0.8) : 0);
        }, 0);
        const totalAvailable = playerCash + sellValue;
        const canAffordWithSell = totalAvailable >= cost;
        
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 bg-[var(--tile-invest-bg)]">
              {data.type === 'real_estate' ? '🏠' : data.type === 'stocks' ? '📈' : '💼'}
            </div>
            <h3 className="text-xl font-bold mb-1">{tContent(data.name)}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">{tContent(data.description)}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="card p-3">
                <div className="text-xs text-[var(--text-subtle)]">{t('down_payment')}</div>
                <div className="text-lg font-bold text-[var(--danger)] tabular-nums">${cost.toLocaleString()}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-[var(--text-subtle)]">{t('monthly_income_label')}</div>
                <div className="text-lg font-bold text-[var(--success)] tabular-nums">+${data.monthly_income.toLocaleString()}</div>
              </div>
            </div>
            
            {/* Your cash info */}
            <div className="text-xs text-[var(--text-muted)] mb-2">
              {lang === 'es' ? 'Tu efectivo' : 'Your cash'}: <b className={canAfford ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>${playerCash.toLocaleString()}</b>
              {!canAfford && <span className="text-[var(--danger)]"> ({lang === 'es' ? 'Te faltan' : 'Need'} ${(cost - playerCash).toLocaleString()})</span>}
            </div>
            
            {/* ALWAYS show sell option if player has assets and doesn't have enough cash */}
            {!canAfford && hasAssets && !showSellPanel && (
              <button onClick={() => setShowSellPanel(true)} className="mb-3 px-4 py-2 rounded-xl text-sm font-bold bg-[rgba(247,215,122,0.1)] border border-[var(--gold)] text-[var(--gold)] hover:bg-[rgba(247,215,122,0.2)] transition-all w-full" data-testid="sell-to-buy-btn">
                💰 {lang === 'es' ? 'Vender activos para completar la compra' : 'Sell assets to complete purchase'}
              </button>
            )}
            
            {/* Sell panel - select assets to sell */}
            {showSellPanel && (
              <div className="mb-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--gold-deep)] text-left">
                <div className="text-xs font-bold text-[var(--gold)] mb-2">
                  {lang === 'es' ? 'Toca los activos que quieres vender:' : 'Tap the assets you want to sell:'}
                </div>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {(playerAssets || []).map((asset, idx) => {
                    const sv = Math.floor((asset.cost || asset.down_payment || 5000) * 0.8);
                    const isSelected = selectedToSell.includes(idx);
                    return (
                      <button key={idx} onClick={() => {
                        setSelectedToSell(prev => isSelected ? prev.filter(i => i !== idx) : [...prev, idx]);
                      }} className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all ${isSelected ? 'bg-[rgba(247,215,122,0.2)] border-2 border-[var(--gold)]' : 'bg-[var(--surface-1)] border-2 border-transparent hover:border-[var(--border)]'}`}>
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-medium truncate">{tContent(asset.name)}</div>
                          <div className="text-[var(--text-subtle)]">+${(asset.monthly_income || 0).toLocaleString()}/{lang === 'es' ? 'mes' : 'mo'}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="font-bold text-[var(--gold)]">${sv.toLocaleString()}</span>
                          {isSelected && <span className="text-[var(--success)]">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 p-2 rounded-lg bg-[var(--surface-1)] flex justify-between text-xs">
                  <span>{lang === 'es' ? 'Venta' : 'Sale'}: <b className="text-[var(--gold)]">${sellValue.toLocaleString()}</b></span>
                  <span>{lang === 'es' ? 'Total disponible' : 'Total available'}: <b className={canAffordWithSell ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>${totalAvailable.toLocaleString()}</b></span>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button onClick={() => { setShowSellPanel(false); setSelectedToSell([]); onResolve({ type: 'skip' }); }} className="flex-1 btn-outline-gold py-3 rounded-xl font-bold" data-testid="invest-skip-btn">
                {t('skip')}
              </button>
              {canAfford ? (
                <button
                  onClick={() => onResolve({ type: 'investment_bought', cost, income: data.monthly_income, investment: data })}
                  className="flex-1 btn-gold py-3 rounded-xl font-bold"
                  data-testid="invest-buy-btn"
                >
                  {t('buy')}
                </button>
              ) : showSellPanel && canAffordWithSell && selectedToSell.length > 0 ? (
                <button
                  onClick={() => onResolve({ type: 'sell_and_buy', soldIndices: [...selectedToSell], cost, income: data.monthly_income, investment: data })}
                  className="flex-1 btn-gold py-3 rounded-xl font-bold animate-pulse-gold"
                  data-testid="sell-and-buy-btn"
                >
                  {lang === 'es' ? '💰 Vender y Comprar' : '💰 Sell & Buy'}
                </button>
              ) : (
                <button disabled className="flex-1 btn-gold py-3 rounded-xl font-bold disabled:opacity-40" data-testid="invest-buy-btn">
                  {t('buy')}
                </button>
              )}
            </div>
          </div>
        );

      case 'opportunity':
        const oppCost = data.cost;
        const canAffordOpp = playerCash >= oppCost;
        const hasAssetsOpp = playerAssets && playerAssets.length > 0;
        const sellValueOpp = selectedToSell.reduce((sum, idx) => {
          const a = (playerAssets || [])[idx];
          return sum + (a ? Math.floor((a.cost || a.down_payment || 5000) * 0.8) : 0);
        }, 0);
        const canAffordOppWithSell = (playerCash + sellValueOpp) >= oppCost;
        
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 bg-[rgba(247,215,122,0.15)]">
              🌟
            </div>
            <h3 className="text-xl font-bold mb-1">{tContent(data.title)}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">{tContent(data.description)}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="card p-3">
                <div className="text-xs text-[var(--text-subtle)]">{t('cost')}</div>
                <div className="text-lg font-bold tabular-nums">${oppCost.toLocaleString()}</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-[var(--text-subtle)]">{t('monthly_income_label')}</div>
                <div className="text-lg font-bold text-[var(--success)] tabular-nums">+${data.monthly_income.toLocaleString()}</div>
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)] mb-2">
              {lang === 'es' ? 'Tu efectivo' : 'Your cash'}: <b className={canAffordOpp ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>${playerCash.toLocaleString()}</b>
              {!canAffordOpp && <span className="text-[var(--danger)]"> ({lang === 'es' ? 'Te faltan' : 'Need'} ${(oppCost - playerCash).toLocaleString()})</span>}
            </div>
            {!canAffordOpp && hasAssetsOpp && !showSellPanel && (
              <button onClick={() => setShowSellPanel(true)} className="mb-3 px-4 py-2 rounded-xl text-sm font-bold bg-[rgba(247,215,122,0.1)] border border-[var(--gold)] text-[var(--gold)] hover:bg-[rgba(247,215,122,0.2)] transition-all w-full" data-testid="sell-to-buy-opp-btn">
                💰 {lang === 'es' ? 'Vender activos para completar la compra' : 'Sell assets to complete purchase'}
              </button>
            )}
            {showSellPanel && (
              <div className="mb-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--gold-deep)] text-left">
                <div className="text-xs font-bold text-[var(--gold)] mb-2">{lang === 'es' ? 'Toca los activos que quieres vender:' : 'Tap assets to sell:'}</div>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {(playerAssets || []).map((asset, idx) => {
                    const sv = Math.floor((asset.cost || asset.down_payment || 5000) * 0.8);
                    const isSel = selectedToSell.includes(idx);
                    return (
                      <button key={idx} onClick={() => setSelectedToSell(prev => isSel ? prev.filter(i => i !== idx) : [...prev, idx])} className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all ${isSel ? 'bg-[rgba(247,215,122,0.2)] border-2 border-[var(--gold)]' : 'bg-[var(--surface-1)] border-2 border-transparent'}`}>
                        <div className="text-left flex-1 min-w-0"><div className="font-medium truncate">{tContent(asset.name)}</div></div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2"><span className="font-bold text-[var(--gold)]">${sv.toLocaleString()}</span>{isSel && <span className="text-[var(--success)]">✓</span>}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 p-2 rounded-lg bg-[var(--surface-1)] flex justify-between text-xs">
                  <span>{lang === 'es' ? 'Venta' : 'Sale'}: <b className="text-[var(--gold)]">${sellValueOpp.toLocaleString()}</b></span>
                  <span>{lang === 'es' ? 'Total' : 'Total'}: <b className={canAffordOppWithSell ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>${(playerCash + sellValueOpp).toLocaleString()}</b></span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowSellPanel(false); setSelectedToSell([]); onResolve({ type: 'skip' }); }} className="flex-1 btn-outline-gold py-3 rounded-xl font-bold">{t('skip')}</button>
              {canAffordOpp ? (
                <button onClick={() => onResolve({ type: 'opportunity_taken', cost: oppCost, income: data.monthly_income, opportunity: data })} className="flex-1 btn-gold py-3 rounded-xl font-bold">{t('buy')}</button>
              ) : showSellPanel && canAffordOppWithSell && selectedToSell.length > 0 ? (
                <button onClick={() => onResolve({ type: 'sell_and_buy', soldIndices: [...selectedToSell], cost: oppCost, income: data.monthly_income, investment: data })} className="flex-1 btn-gold py-3 rounded-xl font-bold animate-pulse-gold">
                  {lang === 'es' ? '💰 Vender y Comprar' : '💰 Sell & Buy'}
                </button>
              ) : (
                <button disabled className="flex-1 btn-gold py-3 rounded-xl font-bold disabled:opacity-40">{t('buy')}</button>
              )}
            </div>
          </div>
        );

      case 'market':
        return (
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 ${data.type === 'boom' ? 'bg-[rgba(57,217,138,0.15)]' : 'bg-[rgba(255,90,106,0.15)]'}`}>
              {data.type === 'boom' ? '📈' : '📉'}
            </div>
            <h3 className="text-xl font-bold mb-1">{tContent(data.title)}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">{tContent(data.description)}</p>
            <div className={`text-lg font-bold mb-6 ${data.type === 'boom' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {data.type === 'boom' ? '↑' : '↓'} {Math.round((data.multiplier - 1) * 100)}%
            </div>
            <button onClick={() => onResolve({ type: 'market_resolved' })} className="w-full btn-gold py-3 rounded-xl font-bold">{t('continue_game')}</button>
          </div>
        );

      case 'tax':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 bg-[rgba(255,90,106,0.15)]">
              🏛️
            </div>
            <h3 className="text-xl font-bold mb-1">{tContent(data.title)}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">{tContent(data.description)}</p>
            <div className="text-2xl font-bold text-[var(--danger)] mb-6 tabular-nums">
              -{data.percentage}% (-${Math.floor(playerCash * data.percentage / 100).toLocaleString()})
            </div>
            <button
              onClick={() => onResolve({ type: 'tax_paid', percentage: data.percentage })}
              className="w-full bg-[var(--danger)] text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all"
            >
              {t('continue_game')}
            </button>
          </div>
        );

      case 'payday_bonus':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl mb-4 bg-[rgba(247,215,122,0.15)]">
              💰
            </div>
            <h3 className="text-xl font-bold mb-1">{t('payday')}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Bonus for landing on payday!</p>
            <div className="text-2xl font-bold text-[var(--success)] mb-6 tabular-nums">+${data.amount}</div>
            <button onClick={() => onResolve({ type: 'payday_collected' })} className="w-full btn-gold py-3 rounded-xl font-bold">{t('continue_game')}</button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <button onClick={() => onResolve({ type: 'skip' })} className="w-full btn-gold py-3 rounded-xl font-bold">{t('continue_game')}</button>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay" data-testid="event-modal">
      <div className="modal-content card panel-premium p-6">
        {renderContent()}
      </div>
    </div>
  );
}
