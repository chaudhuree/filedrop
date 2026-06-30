const int chunkSize = 64 * 1024; // 64KB
const int maxBufferSize = 1024 * 1024; // 1MB
const int maxRelaySize = 512 * 1024; // 512KB
const int speedSampleInterval = 500; // ms
const int maxTransferHistory = 50;
const int maxReconnectAttempts = 10;

const String defaultAvatarUrl =
    'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_three_bfensg.png';

const String deviceIdKey = 'localdrop-device-id';
const String deviceNameKey = 'localdrop-device-name';
const String deviceAvatarKey = 'localdrop-device-avatar';
const String themeKey = 'localdrop-theme';
const String transferHistoryKey = 'localdrop-transfer-history';
const String autoSendKey = 'localdrop-auto-send';
const String autoAcceptKey = 'localdrop-auto-accept';

const Map<String, String> femaleAvatars = {
  'one':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_one_kovlkz.png',
  'two':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_two_ttbjn8.png',
  'three':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/female_three_jkw6mb.png',
};

const Map<String, String> maleAvatars = {
  'one':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_one_imn8ct.png',
  'two':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_two_h6jdvb.png',
  'three':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782120125/male_three_bfensg.png',
};

const Map<String, String> deviceAvatars = {
  'one':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/ipad-four_prg7zr.png',
  'two':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/mac-mini_vzsspc.png',
  'three':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/desktop-one_gkqe8t.png',
  'four':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/laptop-one_tujhhs.png',
  'five':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/laptop-two_tg4zaw.png',
  'six':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/ipad-one_yatazv.png',
  'seven':
      'https://res.cloudinary.com/djftsbsuu/image/upload/v1782127255/ipad-three_jof5o4.png',
};

List<String> get allAvatars => [
  ...femaleAvatars.values,
  ...maleAvatars.values,
  ...deviceAvatars.values,
];
