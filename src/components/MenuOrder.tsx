import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { C } from '../theme';
import { Txt } from './ui';

export type MenuItem = { id: string; name: string; priceUsd: number; desc?: string; tag?: string };

/** Renders a restaurant menu with per-item quantity steppers. Cart lives in the
 *  parent (runtime) so the order survives re-renders and feeds the LI.FI total. */
export function MenuOrder({
  items,
  cart,
  onAdd,
  onRemove,
}: {
  items: MenuItem[];
  cart: Record<string, number>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  // group by tag (section), preserving first-seen order
  const sections: Array<{ tag: string; items: MenuItem[] }> = [];
  for (const it of items) {
    const tag = it.tag ?? 'Menu';
    let s = sections.find((x) => x.tag === tag);
    if (!s) {
      s = { tag, items: [] };
      sections.push(s);
    }
    s.items.push(it);
  }

  return (
    <View style={{ gap: 14 }}>
      {sections.map((section) => (
        <View key={section.tag}>
          <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
            {section.tag}
          </Txt>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 16 }}>
            {section.items.map((it, i) => {
              const qty = cart[it.id] ?? 0;
              return (
                <View
                  key={it.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 13,
                    borderBottomWidth: i === section.items.length - 1 ? 0 : 1,
                    borderBottomColor: C.dividerSoft,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={14.5} w={700} numberOfLines={1}>
                      {it.name}
                    </Txt>
                    {it.desc ? (
                      <Txt size={12} color={C.text3} numberOfLines={1} style={{ marginTop: 1 }}>
                        {it.desc}
                      </Txt>
                    ) : null}
                    <Txt size={13} w={600} color={C.text2} style={{ marginTop: 3 }}>
                      ${it.priceUsd.toFixed(2)}
                    </Txt>
                  </View>
                  {qty === 0 ? (
                    <Pressable
                      testID={`menu-add-${it.id}`}
                      onPress={() => onAdd(it.id)}
                      style={{
                        backgroundColor: C.blueSoft,
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                      }}
                    >
                      <Txt size={13} w={700} color={C.blueLink}>
                        Add
                      </Txt>
                    </Pressable>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Pressable testID={`menu-dec-${it.id}`} onPress={() => onRemove(it.id)} hitSlop={6}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: C.bg,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Minus size={15} color={C.text} strokeWidth={2.6} />
                        </View>
                      </Pressable>
                      <Txt size={15} w={800} style={{ minWidth: 16, textAlign: 'center' }}>
                        {qty}
                      </Txt>
                      <Pressable testID={`menu-inc-${it.id}`} onPress={() => onAdd(it.id)} hitSlop={6}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: C.cta,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={15} color={C.ctaText} strokeWidth={2.6} />
                        </View>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
