// ============================================================
// components/BallSelectorModal.tsx
// Modal premium de escolha de Pokébola
// Visual: dark premium, glow borders, animações suaves
// ============================================================

import { useEffect, useCallback } from 'react';
import type { BallType, BallPriceQuote, CalculatedBallPrice } from '@/backend/ballsService';

// ── Ícones SVG inline das balls ──────────────────────────────

function UltraBallIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#1a1a2e" stroke="#f5c518" strokeWidth="1.5" />
      <path d="M2 20 Q20 13 38 20" stroke="#f5c518" strokeWidth="2.5" fill="none" />
      <path d="M2 20 Q20 27 38 20" stroke="#000" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="5" fill="#1a1a2e" stroke="#f5c518" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.5" fill="#f5c518" />
      <path d="M4 20 H16M24 20 H36" stroke="#f5c518" strokeWidth="2" />
      <circle cx="20" cy="14" r="3" fill="#f5c518" opacity="0.6" />
      <circle cx="20" cy="26" r="3" fill="#333" opacity="0.8" />
    </svg>
  );
}

function PremierBallIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#1a1a2e" stroke="#e8e8e8" strokeWidth="1.5" />
      <path d="M2 20 Q20 13 38 20" stroke="#e8e8e8" strokeWidth="2.5" fill="none" />
      <path d="M2 20 Q20 27 38 20" stroke="#222" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="5" fill="#1a1a2e" stroke="#e8e8e8" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.5" fill="#e8e8e8" />
      <path d="M4 20 H16M24 20 H36" stroke="#e8e8e8" strokeWidth="2" />
      <circle cx="20" cy="14" r="3" fill="#f0f0f0" opacity="0.9" />
      <circle cx="20" cy="26" r="3" fill="#888" opacity="0.8" />
      <path d="M15 9 L17 13 L14 11z M25 9 L23 13 L26 11z" fill="#e8e8e8" opacity="0.7" />
    </svg>
  );
}

function AllianceBallIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#1a1a2e" stroke="#7c6aff" strokeWidth="1.5" />
      <path d="M2 20 Q20 13 38 20" stroke="#7c6aff" strokeWidth="2.5" fill="none" />
      <path d="M2 20 Q20 27 38 20" stroke="#ff4fa0" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="5" fill="#1a1a2e" stroke="#7c6aff" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.5" fill="url(#allianceGrad)" />
      <defs>
        <radialGradient id="allianceGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#b67fff" />
          <stop offset="100%" stopColor="#7c6aff" />
        </radialGradient>
      </defs>
      <path d="M4 20 H16M24 20 H36" stroke="#7c6aff" strokeWidth="2" />
      <circle cx="20" cy="14" r="3" fill="#7c6aff" opacity="0.7" />
      <circle cx="20" cy="26" r="3" fill="#ff4fa0" opacity="0.7" />
    </svg>
  );
}

// ── Formatadores ─────────────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatKK(value: number): string {
  if (value === 0) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}M KK`;
  return `${value.toFixed(2)} KK`;
}

function formatDays(days: number): string {
  if (days === Math.round(days)) return `${days} dia${days !== 1 ? 's' : ''}`;
  return `~${days} dias`;
}

// ── Cores por ball ────────────────────────────────────────────

const BALL_COLORS: Record<BallType, { glow: string; border: string; accent: string; bg: string }> = {
  ultra: {
    glow: 'rgba(245, 197, 24, 0.35)',
    border: '#f5c518',
    accent: '#f5c518',
    bg: 'rgba(245, 197, 24, 0.07)',
  },
  premier: {
    glow: 'rgba(232, 232, 232, 0.3)',
    border: '#e8e8e8',
    accent: '#e8e8e8',
    bg: 'rgba(232, 232, 232, 0.06)',
  },
  alliance: {
    glow: 'rgba(124, 106, 255, 0.4)',
    border: '#7c6aff',
    accent: '#b67fff',
    bg: 'rgba(124, 106, 255, 0.07)',
  },
};

// ── Componente principal ──────────────────────────────────────

interface BallSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ballType: BallType) => void;
  quote: BallPriceQuote | null;
  selectedBall: BallType;
  onSelectBall: (ball: BallType) => void;
  isSubmitting?: boolean;
  pokemonName?: string;
  pokemonImage?: string;
}

export function BallSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  quote,
  selectedBall,
  onSelectBall,
  isSubmitting = false,
  pokemonName,
  pokemonImage,
}: BallSelectorModalProps) {
  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const selectedOption = quote?.options.find(o => o.ball_type === selectedBall);
  const ultraOption = quote?.options.find(o => o.ball_type === 'ultra');

  return (
    <>
      {/* ── Estilos ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .bsm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: bsmFadeIn 0.2s ease;
        }
        @keyframes bsmFadeIn { from { opacity: 0 } to { opacity: 1 } }

        .bsm-modal {
          background: #0d0d1a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          width: 100%; max-width: 680px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
          animation: bsmSlideUp 0.28s cubic-bezier(0.16,1,0.3,1);
          font-family: 'Inter', sans-serif;
        }
        @keyframes bsmSlideUp {
          from { transform: translateY(20px) scale(0.97); opacity: 0 }
          to { transform: translateY(0) scale(1); opacity: 1 }
        }

        .bsm-modal::-webkit-scrollbar { width: 4px }
        .bsm-modal::-webkit-scrollbar-track { background: transparent }
        .bsm-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px }

        .bsm-header {
          padding: 24px 24px 0;
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px;
        }

        .bsm-title-group { display: flex; align-items: center; gap: 14px }

        .bsm-pokemon-thumb {
          width: 54px; height: 54px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .bsm-pokemon-thumb img { width: 100%; height: 100%; object-fit: cover }

        .bsm-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #fff; letter-spacing: 0.5px;
          line-height: 1.2;
        }
        .bsm-subtitle { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 3px }

        .bsm-close {
          width: 34px; height: 34px; border-radius: 8px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
          transition: all 0.15s; line-height: 1;
        }
        .bsm-close:hover { background: rgba(255,255,255,0.1); color: #fff }

        /* ── Avisos ── */
        .bsm-notices {
          margin: 20px 24px 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .bsm-notice {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 14px; border-radius: 10px;
          font-size: 12.5px; line-height: 1.45;
        }
        .bsm-notice-warn {
          background: rgba(255, 190, 50, 0.07);
          border: 1px solid rgba(255, 190, 50, 0.2);
          color: rgba(255, 220, 130, 0.9);
        }
        .bsm-notice-info {
          background: rgba(80, 180, 255, 0.06);
          border: 1px solid rgba(80, 180, 255, 0.18);
          color: rgba(130, 200, 255, 0.9);
        }
        .bsm-notice-ok {
          background: rgba(60, 210, 130, 0.06);
          border: 1px solid rgba(60, 210, 130, 0.18);
          color: rgba(100, 230, 160, 0.9);
        }
        .bsm-notice-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px }

        /* ── Grid de balls ── */
        .bsm-balls-label {
          margin: 22px 24px 12px;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 1.5px;
          color: rgba(255,255,255,0.3);
        }
        .bsm-balls-grid {
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 520px) {
          .bsm-balls-grid { grid-template-columns: 1fr }
        }

        /* ── Card de ball ── */
        .bsm-ball-card {
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          padding: 16px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: 10px;
        }
        .bsm-ball-card:hover { border-color: rgba(255,255,255,0.18); transform: translateY(-1px) }
        .bsm-ball-card.selected {
          transform: translateY(-2px);
        }
        .bsm-ball-card::before {
          content: ''; position: absolute; inset: 0; opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .bsm-ball-card.selected::before { opacity: 1 }

        .bsm-ball-card-header { display: flex; align-items: center; gap: 10px }
        .bsm-ball-icon-wrap {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04);
          flex-shrink: 0;
        }

        .bsm-ball-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px; font-weight: 700; color: #fff;
          line-height: 1.2;
        }
        .bsm-ball-desc {
          font-size: 11.5px; color: rgba(255,255,255,0.4);
          line-height: 1.45; margin-top: 2px;
        }

        .bsm-ball-price-row {
          display: flex; align-items: baseline; justify-content: space-between;
          flex-wrap: wrap; gap: 4px;
        }
        .bsm-ball-price-brl {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px; font-weight: 700; color: #fff;
        }
        .bsm-ball-savings {
          font-size: 11px; font-weight: 600;
          padding: 2px 7px; border-radius: 20px;
          background: rgba(60, 210, 130, 0.12);
          border: 1px solid rgba(60, 210, 130, 0.25);
          color: #3de89a;
        }

        .bsm-ball-kk { font-size: 12px; color: rgba(255,255,255,0.35) }

        .bsm-ball-deadline {
          font-size: 11px; color: rgba(255,255,255,0.35);
          display: flex; align-items: center; gap: 4px;
        }
        .bsm-ball-deadline-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: currentColor; flex-shrink: 0;
        }

        .bsm-ball-req {
          font-size: 10.5px; color: rgba(255, 190, 80, 0.7);
          background: rgba(255, 190, 50, 0.06);
          border: 1px solid rgba(255, 190, 50, 0.15);
          border-radius: 6px; padding: 5px 8px;
          line-height: 1.4;
        }

        .bsm-selected-check {
          position: absolute; top: 10px; right: 10px;
          width: 20px; height: 20px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700;
          opacity: 0; transition: opacity 0.2s;
          background: #fff; color: #000;
        }
        .bsm-ball-card.selected .bsm-selected-check { opacity: 1 }

        /* ── Resumo do selecionado ── */
        .bsm-summary {
          margin: 20px 24px 0;
          padding: 16px; border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .bsm-summary-label { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 3px }
        .bsm-summary-value {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px; font-weight: 700; color: #fff;
        }
        .bsm-summary-value small { font-size: 13px; font-weight: 500; opacity: 0.6 }

        /* ── Footer ── */
        .bsm-footer {
          padding: 20px 24px 24px;
          display: flex; gap: 10px; flex-direction: column;
        }

        .bsm-btn-confirm {
          width: 100%; padding: 14px 20px;
          border-radius: 12px; border: none; cursor: pointer;
          font-family: 'Rajdhani', sans-serif;
          font-size: 17px; font-weight: 700; letter-spacing: 0.5px;
          color: #000;
          transition: all 0.2s ease;
          position: relative; overflow: hidden;
        }
        .bsm-btn-confirm:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1) }
        .bsm-btn-confirm:active:not(:disabled) { transform: translateY(0) }
        .bsm-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed }

        .bsm-btn-cancel {
          width: 100%; padding: 12px 20px;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
          background: transparent; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 14px;
          color: rgba(255,255,255,0.45);
          transition: all 0.2s;
        }
        .bsm-btn-cancel:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7) }

        .bsm-divider {
          height: 1px; background: rgba(255,255,255,0.06); margin: 6px 24px 0;
        }
      `}</style>

      {/* ── Overlay ── */}
      <div className="bsm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bsm-modal" role="dialog" aria-modal="true" aria-label="Escolher Pokébola">

          {/* Header */}
          <div className="bsm-header">
            <div className="bsm-title-group">
              {pokemonImage && (
                <div className="bsm-pokemon-thumb">
                  <img src={pokemonImage} alt={pokemonName ?? 'Pokémon'} />
                </div>
              )}
              <div>
                <div className="bsm-title">Escolher Pokébola</div>
                <div className="bsm-subtitle">
                  {pokemonName ? `Captura de ${pokemonName}` : 'Selecione o tipo de ball para a captura'}
                </div>
              </div>
            </div>
            <button className="bsm-close" onClick={onClose} aria-label="Fechar">✕</button>
          </div>

          {/* Avisos obrigatórios */}
          <div className="bsm-notices">
            <div className="bsm-notice bsm-notice-warn">
              <span className="bsm-notice-icon">⚠️</span>
              <span>As Pokébolas são por conta do cliente e devem ser fornecidas antes do início do serviço.</span>
            </div>
            <div className="bsm-notice bsm-notice-info">
              <span className="bsm-notice-icon">ℹ️</span>
              <span>
                <strong>Premier Ball / Alliance Ball:</strong> é obrigatório entregar no mínimo{' '}
                <strong>1.000 Premier Balls</strong> para início do serviço.
              </span>
            </div>
            <div className="bsm-notice bsm-notice-ok">
              <span className="bsm-notice-icon">✅</span>
              <span>As balls restantes serão devolvidas ao cliente ao final do serviço.</span>
            </div>
          </div>

          {/* Label */}
          <div className="bsm-balls-label">Tipo de Pokébola</div>

          {/* Grid de balls */}
          <div className="bsm-balls-grid">
            {quote?.options.map(option => {
              const isSelected = selectedBall === option.ball_type;
              const colors = BALL_COLORS[option.ball_type];

              return (
                <div
                  key={option.ball_type}
                  className={`bsm-ball-card${isSelected ? ' selected' : ''}`}
                  onClick={() => onSelectBall(option.ball_type)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectBall(option.ball_type)}
                  style={
                    isSelected
                      ? {
                          borderColor: colors.border,
                          boxShadow: `0 0 0 1px ${colors.border}22, 0 0 20px ${colors.glow}`,
                          background: colors.bg,
                        }
                      : {}
                  }
                >
                  {/* Check mark */}
                  <div
                    className="bsm-selected-check"
                    style={{ background: colors.accent, color: '#000' }}
                  >
                    ✓
                  </div>

                  {/* Header do card */}
                  <div className="bsm-ball-card-header">
                    <div
                      className="bsm-ball-icon-wrap"
                      style={isSelected ? { background: `${colors.accent}18` } : {}}
                    >
                      {option.ball_type === 'ultra' && <UltraBallIcon size={32} />}
                      {option.ball_type === 'premier' && <PremierBallIcon size={32} />}
                      {option.ball_type === 'alliance' && <AllianceBallIcon size={32} />}
                    </div>
                    <div>
                      <div
                        className="bsm-ball-name"
                        style={isSelected ? { color: colors.accent } : {}}
                      >
                        {option.ball_type === 'ultra' && 'Ultra Ball'}
                        {option.ball_type === 'premier' && 'Premier Ball'}
                        {option.ball_type === 'alliance' && 'Alliance Ball'}
                      </div>
                      <div className="bsm-ball-desc">
                        {option.ball_type === 'ultra' && 'Padrão premium'}
                        {option.ball_type === 'premier' && '40% de desconto'}
                        {option.ball_type === 'alliance' && '40% de desconto'}
                      </div>
                    </div>
                  </div>

                  {/* Preço */}
                  <div>
                    <div className="bsm-ball-price-row">
                      <span
                        className="bsm-ball-price-brl"
                        style={isSelected ? { color: colors.accent } : {}}
                      >
                        {formatBRL(option.price_brl)}
                      </span>
                      {option.savings_percent > 0 && (
                        <span className="bsm-ball-savings">
                          -{option.savings_percent}%
                        </span>
                      )}
                    </div>
                    {option.price_kk > 0 && (
                      <div className="bsm-ball-kk">{formatKK(option.price_kk)}</div>
                    )}
                  </div>

                  {/* Prazo */}
                  <div className="bsm-ball-deadline">
                    <div className="bsm-ball-deadline-dot" />
                    {formatDays(option.estimated_days)}
                    {option.ball_type !== 'ultra' && ultraOption && (
                      <span style={{ color: 'rgba(255,190,80,0.6)' }}>
                        {' '}(+20%)
                      </span>
                    )}
                  </div>

                  {/* Requisito */}
                  {option.ball_type !== 'ultra' && (
                    <div className="bsm-ball-req">
                      📦 Mín. 1.000 Premier Balls
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo do selecionado */}
          {selectedOption && (
            <div className="bsm-summary">
              <div>
                <div className="bsm-summary-label">Ball selecionada</div>
                <div
                  className="bsm-summary-value"
                  style={{ color: BALL_COLORS[selectedBall].accent }}
                >
                  {selectedBall === 'ultra' && 'Ultra Ball'}
                  {selectedBall === 'premier' && 'Premier Ball'}
                  {selectedBall === 'alliance' && 'Alliance Ball'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="bsm-summary-label">Valor total</div>
                <div className="bsm-summary-value">
                  {formatBRL(selectedOption.price_brl)}
                  <small> / {formatKK(selectedOption.price_kk)}</small>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="bsm-summary-label">Prazo estimado</div>
                <div className="bsm-summary-value">
                  {formatDays(selectedOption.estimated_days)}
                </div>
              </div>
            </div>
          )}

          <div className="bsm-divider" />

          {/* Footer com botões */}
          <div className="bsm-footer">
            <button
              className="bsm-btn-confirm"
              onClick={() => !isSubmitting && onConfirm(selectedBall)}
              disabled={isSubmitting || !selectedOption}
              style={{
                background: BALL_COLORS[selectedBall].accent,
                boxShadow: `0 8px 24px ${BALL_COLORS[selectedBall].glow}`,
              }}
            >
              {isSubmitting ? 'Criando pedido...' : `Confirmar com ${
                selectedBall === 'ultra' ? 'Ultra' :
                selectedBall === 'premier' ? 'Premier' : 'Alliance'
              } Ball →`}
            </button>
            <button className="bsm-btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default BallSelectorModal;
