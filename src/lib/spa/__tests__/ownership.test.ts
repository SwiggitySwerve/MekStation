import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

describe('SPA ownership identity compatibility', () => {
  it.each(['iron_man', 'iron-man', 'iron-will', 'iron_will'])(
    'recognizes stored %s as canonical Iron Man',
    (id) => expect(hasSPA([id], 'iron_man')).toBe(true),
  );

  it('keeps canonical target semantics and does not mutate input', () => {
    const saved = Object.freeze(['iron-man', 'unknown-saved-option']);
    expect(hasSPA(saved, 'vdni')).toBe(false);
    expect(hasSPA(saved, 'iron_man')).toBe(true);
    expect(hasSPA(saved, 'unknown-saved-option')).toBe(true);
    expect(hasSPA(saved, 'other-unknown')).toBe(false);
    expect(hasSPA(['iron_man'], 'iron-man')).toBe(false);
    expect(hasSPA([], 'iron_man')).toBe(false);
    expect(saved).toEqual(['iron-man', 'unknown-saved-option']);
  });
});
