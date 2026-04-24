'use client';

import { getDisplayName, SUB_PRODUCT_PARENT } from '@/lib/products';

const SENTIMENTS = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];

// Kept as hex for Recharts / inline SVG; must stay in sync with globals.css light-mode sentiment vars
export const SENT_HEX: Record<string, string> = {
  very_negative:     '#E53E3E',
  slightly_negative: '#DD6B20',
  neutral:           '#3182CE',
  slightly_positive: '#38A169',
  very_positive:     '#10B259',
};

const SENT_LABELS: Record<string, string> = {
  very_negative:     'Very Neg',
  slightly_negative: 'Slightly Neg',
  neutral:           'Neutral',
  slightly_positive: 'Slightly Pos',
  very_positive:     'Very Pos',
};

// Actual PiggyVest brand product colours (CSS vars take effect in inline styles)
const PRODUCT_COLOR: Record<string, string> = {
  PiggyVest:              'var(--product-pv-color)',
  Pocket:                 'var(--product-pocket-color)',
  PiggyVest_for_Business: 'var(--product-pvb-color)',
  PVB:                    'var(--product-pvb-color)',
  Investify:              'var(--product-pv-color)',
  PiggyFx:                'var(--product-pv-color)',
  Shared:                 'var(--accent-purple)',
};

interface ProductBarProps {
  data: any[];
  showSubProducts?: boolean;
  productColors?: Record<string, string>;
}

function SentimentBar({ productData, total, small }: { productData: any[]; total: number; small?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      height: small ? '7px' : '10px',
      borderRadius: '6px',
      overflow: 'hidden',
      background: 'var(--bar-track)',
      gap: '1px',
    }}>
      {SENTIMENTS.map(s => {
        const count = productData.filter((d: any) => d.overall_sentiment === s).length;
        const pct = (count / (total || 1)) * 100;
        return pct > 0 ? (
          <div
            key={s}
            style={{
              width: `${pct}%`,
              background: SENT_HEX[s],
              minWidth: '2px',
              transition: 'width 0.5s ease',
            }}
            title={`${SENT_LABELS[s]}: ${count} (${Math.round(pct)}%)`}
          />
        ) : null;
      })}
    </div>
  );
}

function LegendRow({ productData, total }: { productData: any[]; total: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
      {SENTIMENTS
        .filter(s => productData.filter((d: any) => d.overall_sentiment === s).length > 0)
        .map(s => {
          const count = productData.filter((d: any) => d.overall_sentiment === s).length;
          const pct = Math.round((count / (total || 1)) * 100);
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: SENT_HEX[s] }} />
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>
                {SENT_LABELS[s]} {pct}%
              </span>
            </div>
          );
        })}
    </div>
  );
}

export default function ProductBar({ data, showSubProducts, productColors }: ProductBarProps) {
  // Collect all unique aspect_products in data
  const rawProducts = [...new Set(data.map((d: any) => d.aspect_product).filter(Boolean))] as string[];

  if (rawProducts.length === 0) {
    return (
      <div className="pv-card pv-section">
        <div className="pv-card-label" style={{ marginBottom: '16px' }}>Sentiment by Product</div>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '20px 0' }}>
          No product data in current filter
        </div>
      </div>
    );
  }

  if (showSubProducts) {
    // Build parent → children map
    // Parents: products that are not sub-products of something else
    // Children: products that have a parent
    const subProductKeys = new Set(Object.keys(SUB_PRODUCT_PARENT));

    // Top-level products (not sub-products)
    const topLevelProducts = rawProducts.filter(p => !subProductKeys.has(p));

    // For PiggyVest, we want to roll up sub-products into its total
    // Build a grouped structure
    type ProductGroup = {
      parent: string;
      parentData: any[];
      children: { name: string; childData: any[] }[];
    };

    const groups: ProductGroup[] = topLevelProducts.map(parent => {
      // Find sub-products that belong to this parent
      const children = rawProducts
        .filter(p => SUB_PRODUCT_PARENT[p] === parent)
        .map(childName => ({
          name: childName,
          childData: data.filter((d: any) => d.aspect_product === childName),
        }))
        .filter(c => c.childData.length > 0);

      // Parent own data (where aspect_product === parent exactly)
      const ownData = data.filter((d: any) => d.aspect_product === parent);

      // If parent has children, aggregate parent data = ownData + all children data
      const allChildData = children.flatMap(c => c.childData);
      const parentData = ownData.concat(allChildData);

      return { parent, parentData, children };
    });

    return (
      <div className="pv-card pv-section">
        <div style={{ marginBottom: '22px' }}>
          <div className="pv-card-label">Sentiment by Product</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
            Hover over bars for exact counts
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {groups.map(({ parent, parentData, children }) => {
            const total = parentData.length;
            const displayName = getDisplayName(parent);
            const dotColor = productColors?.[parent] || PRODUCT_COLOR[parent] || 'var(--accent-primary)';
            const pos = parentData.filter((d: any) => d.overall_sentiment?.includes('positive')).length;
            const posScore = total > 0 ? Math.round((pos / total) * 100) : 0;

            return (
              <div key={parent}>
                {/* Parent product header row */}
                <div className="pv-product-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {displayName}
                    </span>
                    {children.length > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>
                        (incl. sub-products)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '500' }}>
                      {total.toLocaleString()} mentions
                    </span>
                    <span className="pv-badge" style={{
                      background: posScore >= 50 ? 'var(--badge-vpos-bg)' : 'var(--badge-vneg-bg)',
                      color: posScore >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                      fontSize: '10px',
                      padding: '3px 9px',
                    }}>
                      {posScore}% positive
                    </span>
                  </div>
                </div>

                <SentimentBar productData={parentData} total={total} />
                <LegendRow productData={parentData} total={total} />

                {/* Sub-product rows */}
                {children.length > 0 && (
                  <div className="pv-sub-product-row" style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {children.map(({ name: childName, childData }) => {
                        const childTotal = childData.length;
                        const childPos = childData.filter((d: any) => d.overall_sentiment?.includes('positive')).length;
                        const childPosScore = childTotal > 0 ? Math.round((childPos / childTotal) * 100) : 0;
                        const childDisplayName = getDisplayName(childName);
                        const childDotColor = productColors?.[childName] || PRODUCT_COLOR[childName] || dotColor;

                        return (
                          <div key={childName}>
                            <div className="pv-product-head" style={{ marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: childDotColor, flexShrink: 0, opacity: 0.75 }} />
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                  {childDisplayName}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>
                                  {childTotal.toLocaleString()} mentions
                                </span>
                                <span className="pv-badge" style={{
                                  background: childPosScore >= 50 ? 'var(--badge-vpos-bg)' : 'var(--badge-vneg-bg)',
                                  color: childPosScore >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                                  fontSize: '9px',
                                  padding: '2px 7px',
                                }}>
                                  {childPosScore}%+
                                </span>
                              </div>
                            </div>
                            <SentimentBar productData={childData} total={childTotal} small />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global colour legend */}
        <div style={{
          display: 'flex', gap: '16px', paddingTop: '18px',
          marginTop: '12px',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          {SENTIMENTS.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: SENT_HEX[s] }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>{SENT_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Default (non-grouped) mode ──────────────────────────────────────────
  return (
    <div className="pv-card pv-section">
      <div style={{ marginBottom: '22px' }}>
        <div className="pv-card-label">Sentiment by Product</div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
          Hover over bars for exact counts
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {rawProducts.map((product: any) => {
          const productData = data.filter((d: any) => d.aspect_product === product);
          const total = productData.length;
          const displayName = getDisplayName(product);
          const dotColor = productColors?.[product] || PRODUCT_COLOR[product] || 'var(--accent-primary)';

          const pos = productData.filter((d: any) => d.overall_sentiment?.includes('positive')).length;
          const posScore = total > 0 ? Math.round((pos / total) * 100) : 0;

          return (
            <div key={product}>
              {/* Product header row */}
              <div className="pv-product-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {displayName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '500' }}>
                    {total.toLocaleString()} mentions
                  </span>
                  <span className="pv-badge" style={{
                    background: posScore >= 50 ? 'var(--badge-vpos-bg)' : 'var(--badge-vneg-bg)',
                    color: posScore >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontSize: '10px',
                    padding: '3px 9px',
                  }}>
                    {posScore}% positive
                  </span>
                </div>
              </div>

              {/* Stacked sentiment bar */}
              <SentimentBar productData={productData} total={total} />

              {/* Per-segment legend */}
              <LegendRow productData={productData} total={total} />
            </div>
          );
        })}
      </div>

      {/* Global colour legend */}
      <div style={{
        display: 'flex', gap: '16px', paddingTop: '18px',
        marginTop: '12px',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {SENTIMENTS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: SENT_HEX[s] }} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>{SENT_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
