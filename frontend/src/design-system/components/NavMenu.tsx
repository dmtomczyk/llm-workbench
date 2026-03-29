import { useState } from 'react';
import type { ReactNode } from 'react';

export type NavMenuChildItem = {
  id: string;
  label: ReactNode;
  shortLabel?: ReactNode;
};

export type NavMenuItem = {
  id: string;
  label: ReactNode;
  shortLabel?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  children?: NavMenuChildItem[];
};

export type NavMenuProps = {
  title: ReactNode;
  shortTitle?: ReactNode;
  subtitle?: ReactNode;
  shortSubtitle?: ReactNode;
  items: NavMenuItem[];
  defaultActiveId?: string;
  defaultOpenGroupId?: string;
  minHeight?: number;
  narrow?: boolean;
  onChange?: (id: string) => void;
};

export function NavMenu({
  title,
  shortTitle,
  subtitle,
  shortSubtitle,
  items,
  defaultActiveId,
  defaultOpenGroupId,
  minHeight = 420,
  narrow = false,
  onChange,
}: NavMenuProps) {
  const firstLeafId = defaultActiveId ?? items.find((item) => !item.children?.length)?.id ?? items[0]?.id ?? '';
  const [activeId, setActiveId] = useState(firstLeafId);
  const [openGroupId, setOpenGroupId] = useState<string | null>(defaultOpenGroupId ?? null);
  const resolvedTitle = narrow && shortTitle ? shortTitle : title;
  const resolvedSubtitle = narrow && shortSubtitle ? shortSubtitle : subtitle;
  const iconColumn = narrow ? 28 : 32;
  const trailingColumn = narrow ? 24 : 28;
  const rowPaddingX = narrow ? 10 : 14;
  const rowGap = narrow ? 8 : 10;

  const setActive = (id: string) => {
    setActiveId(id);
    onChange?.(id);
  };

  return (
    <div
      role="group"
      aria-label="Navigation menu"
      style={{
        position: 'relative',
        width: '100%',
        minHeight,
        display: 'grid',
        alignContent: 'start',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 2,
          border: '2px solid rgba(208,234,246,0.24)',
          background: 'linear-gradient(180deg, rgba(29,43,58,0.94) 0%, rgba(14,22,32,0.98) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 22px rgba(180,223,243,0.04), 0 0 0 1px rgba(248,252,255,0.03)',
          overflow: 'hidden',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            right: 12,
            height: 1,
            background: 'linear-gradient(90deg, rgba(233,247,255,0.1), rgba(248,252,255,0.98) 22%, rgba(224,239,246,0.2) 55%, rgba(233,247,255,0.1))',
          }}
        />
        <div
          style={{
            padding: '16px 14px 10px',
            display: 'grid',
            gap: 8,
            background: 'linear-gradient(180deg, rgba(41,59,75,0.42) 0%, rgba(21,31,42,0.16) 100%)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{ width: 12, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.94), rgba(224,239,246,0.14))' }} />
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ fontSize: narrow ? 14 : 16, fontWeight: 700, lineHeight: 1, color: '#eef7fd' }}>{resolvedTitle}</div>
              {resolvedSubtitle ? (
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c7dbe7' }}>
                  {resolvedSubtitle}
                </div>
              ) : null}
            </div>
          </div>
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              height: 1,
              background: 'linear-gradient(90deg, rgba(248,252,255,0.98), rgba(233,247,255,0.62) 28%, rgba(224,239,246,0.18) 60%, transparent 90%)',
              boxShadow: '0 0 10px rgba(248,252,255,0.1)',
            }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(33,49,65,0.76) 0%, rgba(15,23,33,0.86) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            padding: '8px 0',
          }}
        >
          {items.map((item, index) => {
            const hasChildren = !!item.children?.length;
            const open = openGroupId === item.id;
            const active = item.id === activeId || (!!item.children?.some((child) => child.id === activeId) && open);

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasChildren) {
                      setOpenGroupId(open ? null : item.id);
                    } else {
                      setActive(item.id);
                      setOpenGroupId(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: `${iconColumn}px minmax(0,1fr) ${trailingColumn}px`,
                    alignItems: 'center',
                    gap: rowGap,
                    minHeight: 46,
                    padding: `0 ${rowPaddingX}px`,
                    border: 0,
                    borderRadius: 0,
                    borderTop: index === 0 ? '0' : '1px solid rgba(208,234,246,0.16)',
                    background: active
                      ? 'radial-gradient(circle at 12% 50%, rgba(244, 251, 255, 0.22), transparent 30%), radial-gradient(circle at 34% 48%, rgba(191, 231, 248, 0.16), transparent 44%), linear-gradient(180deg, rgba(178, 231, 250, 0.34) 0%, rgba(110, 171, 198, 0.24) 100%), radial-gradient(circle at 18% 28%, rgba(244, 251, 255, 0.1), transparent 22%), radial-gradient(circle at 78% 64%, rgba(210, 236, 247, 0.06), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.025), transparent 38%, rgba(255,255,255,0.018) 58%, transparent 74%)'
                      : 'transparent',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 24px rgba(196,234,247,0.05)' : 'none',
                    color: active ? '#f5fbff' : '#d8e7ef',
                    textAlign: 'left',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: 'linear-gradient(180deg, rgba(226,245,255,0.16), rgba(248,252,255,1) 45%, rgba(226,245,255,0.16))',
                      }}
                    />
                  ) : null}
                  {active ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: rowPaddingX,
                        right: rowPaddingX,
                        bottom: 6,
                        height: 1,
                        background: 'linear-gradient(90deg, rgba(248,252,255,0.88), rgba(224,239,246,0.18) 40%, rgba(248,252,255,0.64) 78%, rgba(224,239,246,0.08))',
                      }}
                    />
                  ) : null}
                  <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: active ? '#f6fcff' : '#eef7fd', overflow: 'hidden' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, lineHeight: 1 }}>
                      {item.icon ?? null}
                    </span>
                  </span>
                  <span
                    title={typeof item.label === 'string' ? item.label : undefined}
                    style={{
                      fontSize: narrow ? 14 : 16,
                      fontWeight: active ? 600 : 500,
                      lineHeight: 1.1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {narrow && item.shortLabel ? item.shortLabel : item.label}
                  </span>
                  <span style={{ width: trailingColumn, minWidth: trailingColumn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: active ? '#eef7fd' : '#d6e6ef', fontSize: hasChildren ? 18 : 20, lineHeight: 1, overflow: 'hidden' }}>
                    {hasChildren ? (open ? '⌄' : '›') : item.trailing ?? null}
                  </span>
                </button>

                {hasChildren && open ? (
                  <div style={{ display: 'grid', gap: 0, padding: '4px 0 6px' }}>
                    {item.children!.map((child, childIndex) => {
                      const childActive = activeId === child.id;
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setActive(child.id)}
                          style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: `${iconColumn}px minmax(0,1fr)`,
                            alignItems: 'center',
                            gap: rowGap,
                            minHeight: 38,
                            padding: `0 ${rowPaddingX}px 0 ${narrow ? 22 : 26}px`,
                            border: 0,
                            borderTop: childIndex === 0 ? '1px solid rgba(208,234,246,0.12)' : '1px solid rgba(208,234,246,0.08)',
                            background: childActive ? 'linear-gradient(180deg, rgba(160, 220, 246, 0.16) 0%, rgba(97, 154, 181, 0.1) 100%)' : 'transparent',
                            color: childActive ? '#eef7fd' : '#c8dbe7',
                            textAlign: 'left',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          {childActive ? (
                            <span
                              aria-hidden="true"
                              style={{
                                position: 'absolute',
                                left: rowPaddingX,
                                right: rowPaddingX,
                                bottom: 4,
                                height: 1,
                                background: 'linear-gradient(90deg, rgba(248,252,255,0.72), rgba(224,239,246,0.12) 50%, rgba(248,252,255,0.4))',
                              }}
                            />
                          ) : null}
                          <span style={{ width: 10, height: 1, background: 'linear-gradient(90deg, rgba(248,252,255,0.55), rgba(224,239,246,0.08))' }} />
                          <span
                            title={typeof child.label === 'string' ? child.label : undefined}
                            style={{
                              fontSize: 14,
                              fontWeight: childActive ? 600 : 500,
                              lineHeight: 1.1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {narrow && child.shortLabel ? child.shortLabel : child.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
