import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class StorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static String? getString(String key) => _prefs?.getString(key);
  static Future<bool> setString(String key, String value) async =>
      await _prefs?.setString(key, value) ?? false;

  static int? getInt(String key) => _prefs?.getInt(key);
  static Future<bool> setInt(String key, int value) async =>
      await _prefs?.setInt(key, value) ?? false;

  static bool getBool(String key) => _prefs?.getBool(key) ?? false;
  static Future<bool> setBool(String key, bool value) async =>
      await _prefs?.setBool(key, value) ?? false;

  static List<String> getStringList(String key) =>
      _prefs?.getStringList(key) ?? [];
  static Future<bool> setStringList(String key, List<String> value) async =>
      await _prefs?.setStringList(key, value) ?? false;

  static Future<bool> remove(String key) async =>
      await _prefs?.remove(key) ?? false;

  static List<Map<String, dynamic>> getTransferHistory() {
    final raw = getString(transferHistoryKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = (raw as List).cast<Map<String, dynamic>>();
      return list;
    } catch (_) {
      return [];
    }
  }

  static Future<void> saveTransferHistory(
    List<Map<String, dynamic>> history,
  ) async {
    final limited =
        history.length > maxTransferHistory
            ? history.sublist(history.length - maxTransferHistory)
            : history;
    await setString(transferHistoryKey, limited.toString());
  }
}
