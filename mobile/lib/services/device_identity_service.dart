import 'dart:math';
import '../models/device_info.dart';
import '../utils/constants.dart';
import '../utils/device_detect.dart';
import 'storage_service.dart';

class DeviceIdentityService {
  static Future<DeviceInfo> getOrCreateIdentity() async {
    String id = StorageService.getString(deviceIdKey) ?? '';
    if (id.isEmpty) {
      id = 'device-${DateTime.now().millisecondsSinceEpoch}-${_randomString(9)}';
      await StorageService.setString(deviceIdKey, id);
    }

    String name = StorageService.getString(deviceNameKey) ?? '';
    if (name.isEmpty) {
      name = _generateDeviceName();
      await StorageService.setString(deviceNameKey, name);
    }

    String? avatar = StorageService.getString(deviceAvatarKey);

    final os = await detectOS();

    return DeviceInfo(
      id: id,
      name: name,
      deviceType: detectDeviceType(),
      browser: detectBrowser(),
      os: os,
      colorHash: generateColorHash(id),
      avatar: avatar,
    );
  }

  static Future<void> updateName(String name) async {
    await StorageService.setString(deviceNameKey, name);
  }

  static Future<void> updateAvatar(String avatar) async {
    await StorageService.setString(deviceAvatarKey, avatar);
  }

  static String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final rng = Random();
    return List.generate(length, (_) => chars[rng.nextInt(chars.length)]).join();
  }

  static String _generateDeviceName() {
    final adj = adjectives[Random().nextInt(adjectives.length)];
    final animal = animals[Random().nextInt(animals.length)];
    return '$adj $animal';
  }

  static const adjectives = [
    'Swift', 'Bright', 'Cool', 'Fast', 'Bold', 'Calm', 'Dark', 'Fair',
    'Kind', 'Warm', 'Wild', 'Wise', 'Blue', 'Gold', 'Gray', 'Red',
    'Soft', 'Loud', 'Tall', 'Tiny', 'Deep', 'High', 'Long', 'Near',
    'Rich', 'Pure', 'Rare', 'Safe', 'True', 'Vast', 'Clear', 'Brave',
    'Gentle', 'Happy', 'Lucky', 'Magic', 'Noble', 'Proud', 'Quiet',
    'Sharp', 'Silent', 'Simple', 'Smart', 'Smooth', 'Solid', 'Strong',
    'Sweet', 'Thick', 'Tough', 'Young', 'Agile', 'Keen', 'Light', 'Lively',
    'Merry', 'Mighty', 'Neat', 'Odd', 'Polite', 'Quick', 'Royal', 'Serene',
    'Sleek', 'Sunny', 'Tender', 'Vivid', 'Witty', 'Zesty', 'Cosmic', 'Epic',
    'Fierce', 'Grand', 'Icy', 'Jolly', 'Lunar', 'Marine', 'Peak', 'Prime',
    'Rapid', 'Rural', 'Snowy', 'Urban', 'Vocal', 'Ancient', 'Arctic', 'Blazing',
    'Crystal', 'Daring', 'Electric', 'Frozen', 'Golden', 'Hidden', 'Iron',
    'Jade', 'Marble', 'Mystic', 'Ocean', 'Onyx', 'Pearl', 'Ruby', 'Silver',
    'Solar', 'Storm', 'Thunder', 'Velvet',
  ];

  static const animals = [
    'Fox', 'Wolf', 'Bear', 'Hawk', 'Eagle', 'Lion', 'Tiger', 'Deer',
    'Owl', 'Crow', 'Dove', 'Hare', 'Lynx', 'Moose', 'Otter', 'Puma',
    'Seal', 'Swan', 'Whale', 'Bison', 'Cobra', 'Crane', 'Drake', 'Finch',
    'Gecko', 'Heron', 'Ibis', 'Koala', 'Lemur', 'Macaw', 'Narwhal', 'Panda',
    'Raven', 'Robin', 'Shark', 'Sloth', 'Stork', 'Viper', 'Bison', 'Camel',
    'Falcon', 'Jaguar', 'Leopard', 'Osprey', 'Parrot', 'Python', 'Rabbit',
    'Salmon', 'Toucan', 'Walrus', 'Badger', 'Beaver', 'Bobcat', 'Cheetah',
    'Condor', 'Coyote', 'Dingo', 'Dragon', 'Ermine', 'Ferret', 'Gazelle',
    'Gopher', 'Grizzly', 'Iguana', 'Jackal', 'Marmot', 'Martin', 'Ocelot',
    'Pelican', 'Pigeon', 'Pony', 'Raccoon', 'Serval', 'Spider', 'Turtle',
    'Weasel', 'Wombat', 'Alpaca', 'Amoeba', 'Beetle', 'Bumble', 'Cicada',
    'Dolphin', 'Dragon', 'Fennec', 'Gibbon', 'Hamster', 'Lizard', 'Mantis',
    'Monkey', 'Oyster', 'Penguin', 'Puffer', 'Quokka', 'Raptor', 'Scarab',
    'Spider', 'Tadpole',
  ];
}
