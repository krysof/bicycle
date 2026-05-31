export const PLAYER_AVATARS = [
  { id: "m01", gender: "male", body: 0x2f7d5c, pants: 0x3f5f73, hat: 0x716a63, bag: 0x7a5a3b, skin: 0xf0c08d, hair: 0x514238, scarf: 0xf0d37a, glasses: true, mustache: true, height: 0.98, bodyScale: [1.00, 1.00, 1.00], hairMode: "short", hatVisible: true },
  { id: "m02", gender: "male", body: 0x516c9c, pants: 0x2f3f56, hat: 0x2f4f64, bag: 0x6d5138, skin: 0xe6b07d, hair: 0x2b2520, scarf: 0xe8f0ff, glasses: false, mustache: false, height: 1.02, bodyScale: [1.04, 1.04, 1.02], hairMode: "short", hatVisible: true },
  { id: "m03", gender: "male", body: 0x7b6a4f, pants: 0x4d4f5a, hat: 0x9a8c71, bag: 0x8a6248, skin: 0xf2cfaa, hair: 0x6b5a4c, scarf: 0xcde6b0, glasses: true, mustache: false, height: 0.95, bodyScale: [0.96, 0.98, 0.96], hairMode: "short", hatVisible: true },
  { id: "m04", gender: "male", body: 0x5aaa77, pants: 0x3d4f46, hat: 0x5a7b57, bag: 0x795c40, skin: 0xd9a06f, hair: 0x1f1b18, scarf: 0xffe08a, glasses: false, mustache: true, height: 1.00, bodyScale: [1.02, 1.00, 1.00], hairMode: "short", hatVisible: false },
  { id: "m05", gender: "male", body: 0x8a6fb0, pants: 0x4b4a68, hat: 0x6b5a86, bag: 0x7a5a3b, skin: 0xf0bd92, hair: 0x5a5148, scarf: 0xfff0b8, glasses: true, mustache: true, height: 0.97, bodyScale: [0.98, 1.00, 0.98], hairMode: "short", hatVisible: true },
  { id: "m06", gender: "male", body: 0xd59a34, pants: 0x45515f, hat: 0x8d7346, bag: 0x64452e, skin: 0xe7b789, hair: 0x3a302a, scarf: 0xcef1e0, glasses: false, mustache: false, height: 1.04, bodyScale: [1.03, 1.05, 1.03], hairMode: "short", hatVisible: true },
  { id: "f01", gender: "female", body: 0xb86695, pants: 0x5d6380, hat: 0x8a6fb0, bag: 0x8b5e3c, skin: 0xf2c7a2, hair: 0x4a3a32, scarf: 0xffe08a, glasses: false, mustache: false, height: 0.96, bodyScale: [0.94, 1.00, 0.96], hairMode: "bob", hairBun: false, skirt: true, hatVisible: true },
  { id: "f02", gender: "female", body: 0xd66b53, pants: 0x6f5a43, hat: 0xb86b5f, bag: 0x8b5e3c, skin: 0xf0c08d, hair: 0x2d2420, scarf: 0xe6f2ff, glasses: true, mustache: false, height: 0.98, bodyScale: [0.95, 1.02, 0.96], hairMode: "bun", hairBun: true, skirt: true, hatVisible: false },
  { id: "f03", gender: "female", body: 0x4f91d5, pants: 0x4d5d82, hat: 0x4376a8, bag: 0x7c543a, skin: 0xe6b07d, hair: 0x6b5a4c, scarf: 0xffd2e2, glasses: false, mustache: false, height: 1.00, bodyScale: [0.96, 1.04, 0.96], hairMode: "long", hairBun: false, skirt: false, hatVisible: true },
  { id: "f04", gender: "female", body: 0x5aaa77, pants: 0x4e645a, hat: 0x76a169, bag: 0x8b5e3c, skin: 0xf2cfaa, hair: 0x8c7c68, scarf: 0xfff0b8, glasses: true, mustache: false, height: 0.94, bodyScale: [0.92, 0.98, 0.95], hairMode: "bob", hairBun: false, skirt: true, hatVisible: true },
  { id: "f05", gender: "female", body: 0xc46a78, pants: 0x5d6380, hat: 0x9c6b79, bag: 0x7a5a3b, skin: 0xd9a06f, hair: 0x332a24, scarf: 0xcde6b0, glasses: false, mustache: false, height: 0.99, bodyScale: [0.94, 1.02, 0.96], hairMode: "bun", hairBun: true, skirt: false, hatVisible: false },
  { id: "f06", gender: "female", body: 0x9c7556, pants: 0x6b5b4a, hat: 0xa48a70, bag: 0x7d5a40, skin: 0xf0bd92, hair: 0x3b3029, scarf: 0xe8f0ff, glasses: true, mustache: false, height: 0.97, bodyScale: [0.95, 1.00, 0.96], hairMode: "long", hairBun: false, skirt: true, hatVisible: true },
];

export function randomPlayerAvatarId() {
  return PLAYER_AVATARS[Math.floor(Math.random() * PLAYER_AVATARS.length)]?.id || "m01";
}

export function playerAvatarById(id) {
  return PLAYER_AVATARS.find((avatar) => avatar.id === id) || PLAYER_AVATARS[0];
}
