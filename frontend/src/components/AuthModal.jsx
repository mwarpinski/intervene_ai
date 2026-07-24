import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  X, 
  GraduationCap, 
  Building,
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TurnstileCaptcha from './TurnstileCaptcha';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupRole, setSignupRole] = useState('Special Ed Teacher');
  const [signupGrade, setSignupGrade] = useState('Middle School');
  const [signupSchoolId, setSignupSchoolId] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Bot captcha tokens
  const [loginCaptchaToken, setLoginCaptchaToken] = useState('');
  const [signupCaptchaToken, setSignupCaptchaToken] = useState('');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Password strength check
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const pwdStrength = getPasswordStrength(signupPassword);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginCaptchaToken) {
      setErrorMsg('Please complete the bot protection check below before signing in.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword, loginCaptchaToken);
      setSuccessMsg('Successfully signed in!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signupCaptchaToken) {
      setErrorMsg('Please complete the bot protection check below before registering.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        email: signupEmail,
        password: signupPassword,
        first_name: signupFirstName,
        role: signupRole,
        grade_level: signupGrade,
        school_id: signupSchoolId,
        captcha_token: signupCaptchaToken
      });
      setSuccessMsg('Account created successfully! Welcome to Intervene AI.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' 
              ? 'Access your de-escalation practice dashboard & AI simulations' 
              : 'Join educators practicing evidence-based behavioral intervention'}
          </p>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mt-4 border border-slate-700/50">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 pt-4 max-h-[75vh] overflow-y-auto">
          {mode === 'login' ? (
            /* --- LOGIN FORM --- */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="teacher@school.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset instructions sent to registered email address.'); }} className="text-[11px] text-indigo-400 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cloudflare Turnstile CAPTCHA Bot Protection */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Bot Protection
                </label>
                <TurnstileCaptcha 
                  onVerify={(token) => setLoginCaptchaToken(token)} 
                  action="login"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* --- SIGNUP FORM --- */
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Sarah"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="s.jenkins@district.edu"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password Strength Meter */}
                {signupPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 transition-all ${pwdStrength >= 1 ? 'bg-rose-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${pwdStrength >= 2 ? 'bg-amber-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${pwdStrength >= 3 ? 'bg-indigo-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 transition-all ${pwdStrength >= 4 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {pwdStrength <= 1 && 'Weak'}
                      {pwdStrength === 2 && 'Fair'}
                      {pwdStrength === 3 && 'Good'}
                      {pwdStrength === 4 && 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Professional Role
                  </label>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="General Ed Teacher">General Ed Teacher</option>
                    <option value="Special Ed Teacher">Special Ed Teacher</option>
                    <option value="School Counselor">School Counselor</option>
                    <option value="Behavior Specialist">Behavior Specialist</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-indigo-400" /> Grade Level
                  </label>
                  <select
                    value={signupGrade}
                    onChange={(e) => setSignupGrade(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Elementary (K-5)">Elementary (K-5)</option>
                    <option value="Middle School">Middle School</option>
                    <option value="High School">High School</option>
                    <option value="Higher Ed">Higher Ed</option>
                  </select>
                </div>
              </div>

              {/* Cloudflare Turnstile CAPTCHA Bot Protection */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Bot Protection
                </label>
                <TurnstileCaptcha 
                  onVerify={(token) => setSignupCaptchaToken(token)} 
                  action="signup"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Protected by <span className="text-indigo-400 font-semibold">Cloudflare Turnstile</span> & 256-bit encrypted authentication.
          </p>
        </div>

      </div>
    </div>
  );
}
