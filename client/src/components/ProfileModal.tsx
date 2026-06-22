import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useDeviceStore } from '../stores/useDeviceStore';
import { AVATAR_LIST } from '../utils/constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { myDevice, updateMyName, updateMyAvatar } = useDeviceStore();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');

  useEffect(() => {
    if (isOpen && myDevice) {
      setName(myDevice.name);
      setSelectedAvatar(myDevice.avatar || '');
    }
  }, [isOpen, myDevice]);

  if (!isOpen || !myDevice) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateMyName(name.trim());
    }
    if (selectedAvatar) {
      updateMyAvatar(selectedAvatar);
    }
    onClose();
  };

  const femaleAvatars = Object.entries(AVATAR_LIST.female);
  const maleAvatars = Object.entries(AVATAR_LIST.male);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 "
      id="profile-modal"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >

      <div
        className=" rounded-2xl w-full max-w-md animate-scale-in relative flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--profile-modal-bg, rgba(255,255,255,0.92))',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--profile-modal-border, rgba(0,0,0,0.08))',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
        }}
      >
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          {/* Header — fixed top */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Fixed Top Section: Name Input & Preview */}
          <div className="flex flex-col gap-4 px-6 pb-3 flex-shrink-0">
            {/* Display Name Input */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="profile-name-input"
                className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Display Name
              </label>
              <input
                id="profile-name-input"
                name="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={24}
                required
                autoComplete="off"
                className="px-4 py-2.5 rounded-xl text-sm outline-none font-medium transition-all
                  bg-gray-50 dark:bg-white/5
                  border border-gray-200 dark:border-white/10
                  text-gray-800 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Current Avatar Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border-2 border-primary-500/40 flex-shrink-0">
                {selectedAvatar ? (
                  <img src={selectedAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${myDevice.colorHash}, #6366f1)`,
                    }}
                  >
                    {name ? name.substring(0, 2).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {name || 'Choose a name'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Your profile preview</p>
              </div>
            </div>
          </div>

          {/* Scrollable Middle Section: Avatar Picker */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-2 flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Select Avatar
              </span>

              {/* Female Category */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Female</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {femaleAvatars.map(([key, url]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${selectedAvatar === url
                        ? 'border-primary-500 shadow-lg shadow-primary-500/25 ring-2 ring-primary-500/20'
                        : 'border-gray-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-600'
                        }`}
                    >
                      <img src={url} alt={`Female ${key}`} className="w-full h-full object-cover" />
                      {selectedAvatar === url && (
                        <div className="absolute inset-0 bg-primary-500/15 flex items-end justify-end p-1">
                          <div className="bg-primary-500 text-white p-0.5 rounded-full shadow-md">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Male Category */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Male</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {maleAvatars.map(([key, url]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${selectedAvatar === url
                        ? 'border-primary-500 shadow-lg shadow-primary-500/25 ring-2 ring-primary-500/20'
                        : 'border-gray-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-600'
                        }`}
                    >
                      <img src={url} alt={`Male ${key}`} className="w-full h-full object-cover" />
                      {selectedAvatar === url && (
                        <div className="absolute inset-0 bg-primary-500/15 flex items-end justify-end p-1">
                          <div className="bg-primary-500 text-white p-0.5 rounded-full shadow-md">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Section: Action Buttons */}
          <div className="flex gap-3 px-6 py-4 flex-shrink-0 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                text-gray-600 dark:text-gray-300
                bg-gray-100 dark:bg-white/5
                border border-gray-200 dark:border-white/10
                hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-primary-500 to-primary-600
                hover:from-primary-600 hover:to-primary-700
                shadow-md shadow-primary-500/30 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Dark mode style overrides */}
      <style>{`
        .dark #profile-modal > div:first-child {
          --profile-modal-bg: rgba(20, 20, 45, 0.92);
          --profile-modal-border: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
}
