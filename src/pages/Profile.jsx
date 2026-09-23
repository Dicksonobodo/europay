import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Bell, Shield, HelpCircle, Users, Lock, MessageCircle,
  Copy, Check, LogOut, ChevronRight, ShieldCheck, Fingerprint,
  Activity, Snowflake, Sliders, Camera, Loader,
} from 'lucide-react';
import { logoutUser } from '../firebase/auth';
import { freezeCard, setDailyLimit, updateProfilePicture } from '../firebase/firestore';
import useAuth from '../hooks/useAuth';
import BottomNav from '../components/ui/BottomNav';
import Modal from '../components/ui/Modal';
import { PinSetup } from '../components/security/PinLock';
import LoginActivity from '../components/security/LoginActivity';
import NotificationCentre from '../components/security/NotificationCentre';

const CLOUDINARY_CLOUD = 'gq3ylbtt';
const CLOUDINARY_PRESET = 'europay_uploads';

const Profile = () => {
  const navigate = useNavigate();
  const { userData, currentUser, refreshUserData } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [limitLoading, setLimitLoading] = useState(false);
  const [pinSaved, setPinSaved] = useState(!!localStorage.getItem('europay_pin'));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(userData?.cardNumber?.toString() || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyIban = () => {
    navigator.clipboard.writeText(userData?.iban || '');
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const handleFreeze = async () => {
    setFreezeLoading(true);
    await freezeCard(currentUser.uid, !userData?.isFrozen);
    await refreshUserData();
    setFreezeLoading(false);
  };

  const handleSetLimit = async () => {
    if (!newLimit) return;
    setLimitLoading(true);
    await setDailyLimit(currentUser.uid, parseFloat(newLimit));
    await refreshUserData();
    setLimitLoading(false);
    setShowLimitModal(false);
    setNewLimit('');
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5MB');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'europay/profiles');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      await updateProfilePicture(currentUser.uid, data.secure_url);
      await refreshUserData();
    } catch (err) {
      setPhotoError('Upload failed. Please try again.');
    }

    setUploadingPhoto(false);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const joined = userData?.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) || 'N/A';

  const formatIban = (iban) => {
    if (!iban) return 'Not assigned';
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  if (showPinSetup) return (
    <PinSetup
      onSave={() => { setPinSaved(true); setShowPinSetup(false); }}
      onSkip={() => setShowPinSetup(false)}
    />
  );
  if (showActivity) return <LoginActivity onBack={() => setShowActivity(false)} />;
  if (showNotifications) return <NotificationCentre onBack={() => setShowNotifications(false)} />;

  const securityItems = [
    {
      icon: Fingerprint,
      label: pinSaved ? 'Change PIN' : 'Set Up PIN Lock',
      sublabel: pinSaved ? 'PIN is active' : 'Secure your app with a PIN',
      action: () => setShowPinSetup(true),
      color: '#7c3aed',
    },
    {
      icon: Snowflake,
      label: userData?.isFrozen ? 'Unfreeze Card' : 'Freeze Card',
      sublabel: userData?.isFrozen ? 'Card is currently frozen' : 'Temporarily block transactions',
      action: handleFreeze,
      color: userData?.isFrozen ? '#10b981' : '#3b82f6',
      loading: freezeLoading,
    },
    {
      icon: Sliders,
      label: 'Daily Spending Limit',
      sublabel: `Current limit: €${userData?.dailyLimit || 1000}`,
      action: () => setShowLimitModal(true),
      color: '#f59e0b',
    },
    {
      icon: Activity,
      label: 'Login Activity',
      sublabel: 'View recent sign-in sessions',
      action: () => setShowActivity(true),
      color: '#6d28d9',
    },
  ];

  const menuItems = [
    { icon: Bell, label: 'Notifications', action: () => setShowNotifications(true), color: '#5b21b6' },
    { icon: Settings, label: 'Account Settings', color: '#7c3aed' },
    { icon: HelpCircle, label: 'Help & FAQ', color: '#6d28d9' },
    { icon: Users, label: 'Refer Friends', color: '#7c3aed' },
    { icon: Lock, label: 'Privacy Policy', color: '#5b21b6' },
    { icon: MessageCircle, label: 'Message Support', action: () => navigate('/support'), color: '#4c1d95' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 96 }}>
      <div style={{ padding: '56px 20px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>Profile</h1>

        {/* Admin Panel button */}
        {userData?.role === 'admin' && (
          <button onClick={() => navigate('/admin')} style={{
            width: '100%', marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(45,27,105,0.3))',
            border: '1px solid rgba(124,58,237,0.5)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          }}>
            <div style={{ width: 40, height: 40, background: 'rgba(124,58,237,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#a78bfa" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>Admin Panel</p>
              <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.6)' }}>Manage users & accounts</p>
            </div>
            <ChevronRight size={16} color="#a78bfa" />
          </button>
        )}

        {/* User Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f0f1a, #1e0a3c)',
          borderRadius: 24, padding: '24px 20px',
          border: '1px solid rgba(124,58,237,0.3)', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>

            {/* Profile picture */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 64, height: 64,
                background: 'linear-gradient(135deg, #7c3aed, #2d1b69)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(124,58,237,0.5)',
                overflow: 'hidden',
              }}>
                {userData?.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }}
                  />
                ) : (
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                    {userData?.fullName?.[0] || 'U'}
                  </span>
                )}
                {uploadingPhoto && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Loader size={20} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
              </div>

              {/* Camera button */}
              <button
                onClick={handlePhotoClick}
                disabled={uploadingPhoto}
                style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 24, height: 24,
                  background: '#7c3aed',
                  borderRadius: '50%',
                  border: '2px solid #0f0f1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Camera size={11} color="#fff" />
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{userData?.fullName}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{userData?.email}</p>
              {photoError && (
                <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{photoError}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(124,58,237,0.12)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Tier</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: userData?.tier === 2 ? '#10b981' : '#f59e0b' }}>
                {userData?.tier === 2 ? 'Tier 2 ✓' : 'Tier 1'}
              </p>
            </div>
            <div style={{ background: 'rgba(124,58,237,0.12)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.7)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Joined</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{joined}</p>
            </div>
          </div>
        </div>

        {/* Card number */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Card Number</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', letterSpacing: 3 }}>•••• {userData?.cardNumber}</p>
          </div>
          <button onClick={handleCopy} style={{
            background: copied ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
            border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border-light)'}`,
            borderRadius: 10, padding: '8px 14px',
            color: copied ? '#10b981' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* IBAN */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>IBAN</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: 1, lineHeight: 1.6 }}>
                {formatIban(userData?.iban)}
              </p>
            </div>
            <button onClick={handleCopyIban} style={{
              background: copiedIban ? 'rgba(16,185,129,0.12)' : 'var(--bg-elevated)',
              border: `1px solid ${copiedIban ? 'rgba(16,185,129,0.3)' : 'var(--border-light)'}`,
              borderRadius: 10, padding: '8px 14px',
              color: copiedIban ? '#10b981' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              {copiedIban ? <Check size={14} /> : <Copy size={14} />}
              {copiedIban ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Security section */}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Security</p>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
          {securityItems.map(({ icon: Icon, label, sublabel, action, color, loading: itemLoading }, i) => (
            <button key={label} onClick={action} disabled={itemLoading} style={{
              width: '100%', background: 'none', border: 'none',
              borderBottom: i < securityItems.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', textAlign: 'left', opacity: itemLoading ? 0.6 : 1,
            }}>
              <div style={{ width: 38, height: 38, background: `${color}22`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{itemLoading ? 'Updating…' : label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{sublabel}</p>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </button>
          ))}
        </div>

        {/* General menu */}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>General</p>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
          {menuItems.map(({ icon: Icon, label, action, color }, i) => (
            <button key={label} onClick={action || undefined} style={{
              width: '100%', background: 'none', border: 'none',
              borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 36, height: 36, background: `${color}22`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={() => setLogoutModal(true)} style={{
          width: '100%',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 16, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
        }}>
          <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} color="#ef4444" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#ef4444' }}>Log Out</span>
        </button>
      </div>

      {/* Logout Modal */}
      <Modal open={logoutModal} onClose={() => setLogoutModal(false)} title="Log Out?">
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
          Are you sure you want to log out of Europay?
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setLogoutModal(false)} style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
            borderRadius: 14, padding: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleLogout} style={{
            flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 14, padding: 14, color: '#ef4444', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Log Out</button>
        </div>
      </Modal>

      {/* Daily Limit Modal */}
      <Modal open={showLimitModal} onClose={() => setShowLimitModal(false)} title="Set Daily Limit">
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          Current limit: <strong style={{ color: 'var(--text-primary)' }}>€{userData?.dailyLimit || 1000}</strong>
        </p>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--purple-light)', fontWeight: 700 }}>€</span>
          <input
            style={{
              width: '100%', background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)', borderRadius: 14,
              padding: '14px 16px 14px 34px', color: 'var(--text-primary)', fontSize: 18, fontWeight: 700,
            }}
            placeholder="Enter new limit"
            type="number"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[500, 1000, 2000, 5000].map((v) => (
            <button key={v} onClick={() => setNewLimit(v.toString())} style={{
              flex: 1, background: newLimit === v.toString() ? 'rgba(124,58,237,0.2)' : 'var(--bg-elevated)',
              border: `1px solid ${newLimit === v.toString() ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
              borderRadius: 10, padding: '8px 0',
              color: newLimit === v.toString() ? '#a78bfa' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>€{v}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowLimitModal(false)} style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
            borderRadius: 14, padding: 14, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSetLimit} disabled={!newLimit || limitLoading} style={{
            flex: 1, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none',
            borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: !newLimit || limitLoading ? 0.5 : 1,
          }}>{limitLoading ? 'Saving…' : 'Save Limit'}</button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};

export default Profile;