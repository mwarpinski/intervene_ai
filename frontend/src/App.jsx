import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  Heart, 
  FolderOpen, 
  Sun, 
  Moon, 
  Send, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  FileText, 
  RotateCcw,
  ArrowRight,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [activeSim, setActiveSim] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Self-care state
  const [moodScore, setMoodScore] = useState(3);
  const [careNotes, setCareNotes] = useState('');
  const [careLogs, setCareLogs] = useState([
    { id: '1', mood_score: 4, activity_type: 'Box Breathing', notes: 'Felt stressed before math class. Breathing helped regulate.', created_at: new Date(Date.now() - 3600000).toISOString() }
  ]);
  const [breathState, setBreathState] = useState('rest'); // rest, inhale, hold, exhale, hold-out
  const [breathText, setBreathText] = useState('Click Start to Breathe');
  const [breathCountdown, setBreathCountdown] = useState(4);
  const [isBreathing, setIsBreathing] = useState(false);
  const breathingInterval = useRef(null);

  // Learning progress state
  const [modules, setModules] = useState([
    { id: 'empathy_101', title: 'Empathy & Validation', description: 'De-escalate the nervous system first.', status: 'completed' },
    { id: 'limits_101', title: 'Kind Limit Setting', description: 'Establish clear, positive boundaries.', status: 'in_progress' },
    { id: 'traps_101', title: 'Spotting Response Traps', description: 'Avoid coercion, sarcasm, and threats.', status: 'not_started' }
  ]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [flipCard, setFlipCard] = useState(false);

  // Mock data fallbacks if backend is offline
  const mockPersonas = [
    {
      id: 'leo-mock',
      name: 'Leo',
      age: 6,
      difficulty_level: 'Beginner',
      profile_details: 'Leo is a 6-year-old who has ADHD. He struggles with transitions, is highly hyperactive, and loves dinosaurs. When asked to transition or clean up, he walks around, taps others, or makes dinosaur noises.',
      base_prompt: 'Leo simulator prompt'
    },
    {
      id: 'maya-mock',
      name: 'Maya',
      age: 10,
      difficulty_level: 'Intermediate',
      profile_details: 'Maya is 10 and has a history of trauma. She shuts down, pulls her hood up, and refuses to talk when feeling academically overwhelmed or pressured. She is extremely sensitive to authoritative tones.',
      base_prompt: 'Maya simulator prompt'
    },
    {
      id: 'jordan-mock',
      name: 'Jordan',
      age: 15,
      difficulty_level: 'Advanced',
      profile_details: 'Jordan is a 15-year-old high school sophomore. He acts oppositional and uses sarcasm to test boundaries in front of peers. He is highly sensitive to respect and power struggles.',
      base_prompt: 'Jordan simulator prompt'
    },
    {
      id: 'jax-mock',
      name: 'Jax',
      age: 14,
      difficulty_level: 'Crisis Management',
      profile_details: 'Jax is a 14-year-old student who exhibits severe externalizing behavior and triggers easily into fight-or-flight crisis. He is known to yell, throw insults, slam books, and walk around aggressively.',
      base_prompt: 'Jax simulator prompt'
    }
  ];

  // Preset Dialogue Suggestions for Scaffolding practice (quick buttons)
  const dialogueScaffolds = {
    Leo: [
      { text: "Leo, sit down right now or you won't get recess!", type: "coercion", text_type: "Response Trap" },
      { text: "Leo, I see you are playing with dinosaurs and having fun. And it is time to walk back to your desk. You can choose to walk like a T-Rex or a raptor.", type: "expert", text_type: "Co-regulation & Choice" },
      { text: "Oh, look at Leo, running around again. What a shocker.", type: "sarcasm", text_type: "Response Trap" },
      { text: "Can you please sit down? Please? For me?", type: "pleading", text_type: "Response Trap" }
    ],
    Maya: [
      { text: "Maya, if you don't do this worksheet you're getting a zero.", type: "coercion", text_type: "Response Trap" },
      { text: "Maya, I notice your hood is up and you're drawing. Math feels really hard right now, doesn't it? I'm here to help. Let's do just the first problem together.", type: "expert", text_type: "Validation & Scaffolding" },
      { text: "Wow, Maya, nice effort on that drawing. Maybe do some math instead?", type: "sarcasm", text_type: "Response Trap" },
      { text: "Maya, look at me when I'm speaking to you.", type: "coercion", text_type: "Response Trap" }
    ],
    Jordan: [
      { text: "Close that screen now or I will write you up for detention.", type: "coercion", text_type: "Response Trap" },
      { text: "Jordan, I hear that this feels pointless. And we still need to close the Chromebook. Let's talk after class about how to make this more useful for you.", type: "expert", text_type: "Respectful Boundary" },
      { text: "Right, because checking your social status is way more important than graduation.", type: "sarcasm", text_type: "Response Trap" },
      { text: "Just do the work, please? Don't make this a whole big deal today.", type: "pleading", text_type: "Response Trap" }
    ],
    Jax: [
      { text: "Shut the hell up and sit down, or you are suspended right now!", type: "coercion", text_type: "Response Trap" },
      { text: "Jax, I see you are completely furious and overwhelmed right now. I'm going to take a step back and give you some space. We don't have to talk about this worksheet until you are ready.", type: "expert", text_type: "De-escalation & Space" },
      { text: "Nice language, Jax. Is that how you talk to your mother?", type: "sarcasm", text_type: "Response Trap" },
      { text: "Jax, please stop yelling. You're making everyone uncomfortable.", type: "pleading", text_type: "Response Trap" }
    ]
  };

  const attachPersona = (simData) => {
    if (!simData) return null;
    let p = personas.find(pers => pers.id === simData.persona_id);
    if (!p) {
      p = mockPersonas.find(pers => pers.id === simData.persona_id);
    }
    if (!p && activeSim) {
      p = activeSim.persona;
    }
    if (!p) {
      p = personas[0] || mockPersonas[0];
    }
    return { ...simData, persona: p };
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Fetch personas on load
  useEffect(() => {
    async function getPersonas() {
      try {
        const res = await fetch(`${API_BASE}/personas`);
        if (res.ok) {
          const data = await res.json();
          setPersonas(data);
        } else {
          setPersonas(mockPersonas);
        }
      } catch (err) {
        console.log("Backend offline, loading offline mock personas.");
        setPersonas(mockPersonas);
      }
    }
    getPersonas();
  }, []);

  // Handle Box Breathing Timer Loop
  useEffect(() => {
    if (isBreathing) {
      breathingInterval.current = setInterval(() => {
        setBreathCountdown(prev => {
          if (prev <= 1) {
            // State machine transition
            setBreathState(curr => {
              if (curr === 'rest' || curr === 'hold-out') {
                setBreathText('Inhale...');
                return 'inhale';
              } else if (curr === 'inhale') {
                setBreathText('Hold...');
                return 'hold';
              } else if (curr === 'hold') {
                setBreathText('Exhale...');
                return 'exhale';
              } else if (curr === 'exhale') {
                setBreathText('Hold...');
                return 'hold-out';
              }
              return 'rest';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(breathingInterval.current);
      setBreathState('rest');
      setBreathText('Click Start to Breathe');
      setBreathCountdown(4);
    }

    return () => clearInterval(breathingInterval.current);
  }, [isBreathing]);

  // Start Simulation Session
  const startSimulation = async (personaId) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/simulations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'educator-demo',
          persona_id: personaId,
          scenario_type: 'Classroom Transition'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const detailsRes = await fetch(`${API_BASE}/simulations/${data.id}`);
        const detailsData = await detailsRes.json();
        setActiveSim(attachPersona(detailsData));
      } else {
        // Mock fallback simulation session setup
        const selectedPersona = personas.find(p => p.id === personaId) || mockPersonas[0];
        const initialTriggerText = selectedPersona.name === "Leo" 
          ? "*stands up, walks around the room, taps others* Dinosaurs don't do math! I'm not sitting down!"
          : selectedPersona.name === "Maya"
          ? "*head down, hood up, whispering* I don't know the answers. Just leave me alone."
          : selectedPersona.name === "Jordan"
          ? "*scoffs, rolling eyes, looks at phone* This assignment is completely pointless. I'm not wasting my time."
          : "*paces aggressively, slams desk* Get out of my face! I don't give a damn about this stupid class!";

        setActiveSim({
          id: 'mock-session-' + Date.now(),
          persona: selectedPersona,
          persona_id: selectedPersona.id,
          status: 'in_progress',
          escalation_score: selectedPersona.name === "Jax" ? 80 : 60,
          messages: [
            { id: '1', sender: 'student', content: initialTriggerText, escalation_change: 0, created_at: new Date().toISOString() }
          ]
        });
      }
    } catch (err) {
      // Mock fallback simulation session setup (on network error)
      const selectedPersona = personas.find(p => p.id === personaId) || mockPersonas[0];
      const initialTriggerText = selectedPersona.name === "Leo" 
        ? "*stands up, walks around the room, taps others* Dinosaurs don't do math! I'm not sitting down!"
        : selectedPersona.name === "Maya"
        ? "*head down, hood up, whispering* I don't know the answers. Just leave me alone."
        : selectedPersona.name === "Jordan"
        ? "*scoffs, rolling eyes, looks at phone* This assignment is completely pointless. I'm not wasting my time."
        : "*paces aggressively, slams desk* Get out of my face! I don't give a damn about this stupid class!";

      setActiveSim({
        id: 'mock-session-' + Date.now(),
        persona: selectedPersona,
        persona_id: selectedPersona.id,
        status: 'in_progress',
        escalation_score: selectedPersona.name === "Jax" ? 80 : 60,
        messages: [
          { id: '1', sender: 'student', content: initialTriggerText, escalation_change: 0, created_at: new Date().toISOString() }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit dialogue step
  const submitStep = async (content) => {
    if (!content.trim() || isLoading) return;
    setIsLoading(true);
    setChatInput('');

    try {
      if (activeSim.id.startsWith('mock-session-')) {
        // Run mock response generation offline
        const teacherMsg = { id: 'msg-' + Date.now(), sender: 'educator', content, escalation_change: 0, created_at: new Date().toISOString() };
        
        // Analyze response triggers
        const text = content.toLowerCase();
        const isEmpathy = text.includes('understand') || text.includes('hear') || text.includes('sorry') || text.includes('feel') || text.includes('tough') || text.includes('hard');
        const isCoercive = text.includes('must') || text.includes('consequence') || text.includes('office') || text.includes('principal') || text.includes('recess') || text.includes('or else') || text.includes('warn');
        const isSarcastic = text.includes('really') || text.includes('seriously') || text.includes('smart') || text.includes('whatever');
        const isLimit = text.includes('time to') || text.includes('need to') || text.includes('rule is') || text.includes('put the');

        let change = 0;
        let responseText = '';
        let emotion = '';

        if (activeSim.persona.name === "Leo") {
          if (isEmpathy && isLimit) {
            change = -15;
            responseText = "Okay... I just really don't want to do the math page. It has too many numbers. But I can put my toys away.";
            emotion = "relieved";
          } else if (isEmpathy) {
            change = -10;
            responseText = "Yeah, it is hard! But can I keep playing with my dinosaurs?";
            emotion = "seeking connection";
          } else if (isCoercive || isSarcastic) {
            change = 20;
            responseText = "NO! You can't make me! *screams and kicks table leg*";
            emotion = "fight response (anger)";
          } else {
            change = 5;
            responseText = "I don't care! Dinosaurs are better than worksheets!";
            emotion = "avoidance";
          }
        } else if (activeSim.persona.name === "Maya") {
          if (isEmpathy && isLimit) {
            change = -15;
            responseText = "*sniffles, nods slowly* Okay. I will sit at the table. Can I keep my soft toy in my lap?";
            emotion = "settling";
          } else if (isEmpathy) {
            change = -8;
            responseText = "*keeps head down, whispers* Everyone is looking at me. I hate this classroom.";
            emotion = "shame / anxiety";
          } else if (isCoercive || isSarcastic) {
            change = 25;
            responseText = "*tucks knees tighter to chest, turns completely away, and refuses to speak*";
            emotion = "freeze response (shut down)";
          } else {
            change = 5;
            responseText = "*does not look up, doodles aggressively on the desk*";
            emotion = "avoidant freeze";
          }
        } else if (activeSim.persona.name === "Jordan") {
          if (isEmpathy && isLimit) {
            change = -15;
            responseText = "Whatever. I don't see why it matters so much. Fine, I'll close the chromebook. But this assignment is still garbage.";
            emotion = "compliant defiance";
          } else if (isEmpathy) {
            change = -10;
            responseText = "Yeah, well, this class is boring anyway. None of it makes sense.";
            emotion = "frustrated defense";
          } else if (isCoercive || isSarcastic) {
            change = 20;
            responseText = "Oh, what are you gonna do, write me up? Go ahead. See if I care.";
            emotion = "oppositional fight";
          } else {
            change = 5;
            responseText = "This is stupid. I'm not doing this.";
            emotion = "defensive check-out";
          }
        } else { // Jax
          if (isEmpathy && isLimit) {
            change = -15;
            responseText = "*pacing slows slightly, glares at you* Fine, whatever. Just stay out of my space. I don't want to talk right now.";
            emotion = "de-escalating rage";
          } else if (isEmpathy) {
            change = -10;
            responseText = "*breathes heavily, arms crossed* You don't know what it's like. Everyone is always on my back.";
            emotion = "defensive trust building";
          } else if (isCoercive || isSarcastic) {
            change = 25;
            responseText = "MAKE ME! *kicks a chair hard and slams the door as he storms out*";
            emotion = "extreme fight response (crisis)";
          } else {
            change = 5;
            responseText = "*yells* I don't give a damn about your rules! Leave me alone!";
            emotion = "hostile fight";
          }
        }

        const newStress = Math.min(Math.max(activeSim.escalation_score + change, 0), 100);
        const studentMsg = { id: 'msg-' + (Date.now() + 1), sender: 'student', content: responseText, escalation_change: change, created_at: new Date().toISOString() };
        
        let newStatus = 'in_progress';
        if (newStress >= 100) newStatus = 'abandoned';
        else if (newStress <= 15) newStatus = 'completed';

        setActiveSim(prev => ({
          ...prev,
          escalation_score: newStress,
          status: newStatus,
          messages: [...prev.messages, teacherMsg, studentMsg]
        }));

      } else {
        // Connect to FastAPI Backend
        const res = await fetch(`${API_BASE}/simulations/${activeSim.id}/step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: 'educator', content })
        });
        if (res.ok) {
          const data = await res.json();
          setActiveSim(attachPersona(data));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Evaluate Simulation
  const evaluateSimulation = async () => {
    if (!activeSim) return;
    setIsLoading(true);

    try {
      if (activeSim.id.startsWith('mock-session-')) {
        // Create mock feedback evaluation offline
        const dialogueHistory = activeSim.messages;
        const teacherMsgs = dialogueHistory.filter(m => m.sender === 'educator').map(m => m.content.toLowerCase());
        
        let traps = [];
        let justification = {};
        let empathy = 50;
        let boundary = 50;

        teacherMsgs.forEach(text => {
          if (text.includes('must') || text.includes('consequence') || text.includes('office') || text.includes('principal') || text.includes('recess') || text.includes('warn')) {
            if (!traps.includes('coercion')) {
              traps.push('coercion');
              justification['coercion'] = "You threatened loss of recess or referral. During nervous system overwhelm, logical threats force secondary survival behaviors (fight/flight) instead of co-regulation.";
            }
          }
          if (text.includes('really') || text.includes('seriously') || text.includes('smart') || text.includes('whatever')) {
            if (!traps.includes('sarcasm')) {
              traps.push('sarcasm');
              justification['sarcasm'] = "You used a passive-aggressive or sarcastic phrase, which decreases the student's felt safety and creates secondary behavioral barriers.";
            }
          }
          if (text.includes('understand') || text.includes('hear') || text.includes('feel') || text.includes('tough') || text.includes('hard')) {
            empathy = Math.min(empathy + 20, 100);
          }
          if (text.includes('time to') || text.includes('need to') || text.includes('rule is') || text.includes('put the')) {
            boundary = Math.min(boundary + 20, 100);
          }
        });

        const feedbackData = {
          id: 'feedback-mock',
          simulation_id: activeSim.id,
          empathy_score: empathy,
          boundary_score: boundary,
          traps_identified: traps,
          traps_justification: justification,
          expert_comparison: traps.length === 0 
            ? "Your responses consistently paired emotional validation with clear guidelines. The student's nervous system was co-regulated successfully." 
            : "While you attempted to resolve the classroom disruption, you defaulted to exclusion/power dynamics. Practicing empathy first creates a bridge of safety before requesting action.",
          constructive_advice: "Prioritize naming the student's unexpressed emotion ('I see you are feeling frustrated...'). Wait for physical regulation signs (shoulders drop, eye contact relaxes) before requesting limit compliance."
        };

        setFeedback(feedbackData);
        setActiveTab('feedback');
        setActiveSim(null);

      } else {
        // Call FastAPI evaluate endpoint
        const res = await fetch(`${API_BASE}/simulations/${activeSim.id}/evaluate`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setFeedback(data);
          setActiveTab('feedback');
          setActiveSim(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Log Self-Care
  const submitSelfCare = async (e) => {
    e.preventDefault();
    const newLog = {
      id: 'log-' + Date.now(),
      mood_score: moodScore,
      activity_type: 'Mood Check-in',
      notes: careNotes || 'Routine check-in',
      created_at: new Date().toISOString()
    };

    setCareLogs(prev => [newLog, ...prev]);
    setCareNotes('');
    
    try {
      await fetch(`${API_BASE}/self-care`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'educator-demo',
          mood_score: moodScore,
          activity_type: 'Mood Check-in',
          notes: careNotes
        })
      });
    } catch (err) {
      console.log("Backend offline, saved log locally.");
    }
  };

  // Determine stress state classes
  const getStressMeterClass = (score) => {
    if (score < 35) return 'stress-low';
    if (score < 75) return 'stress-med';
    return 'stress-high';
  };

  // Determine stress state text description
  const getStressStatus = (score) => {
    if (score < 30) return 'Regulated';
    if (score < 60) return 'Tense / Anxious';
    if (score < 85) return 'Dysregulated';
    return 'Crisis / Fight-Flight';
  };

  return (
    <div id="root" className={theme === 'dark' ? 'dark-theme' : ''}>
      {/* Top Navbar */}
      <nav className="navbar">
        <a href="#" className="nav-logo" onClick={() => setActiveTab('dashboard')}>
          <Sparkles className="icon-sage" />
          <span>Intervene AI</span>
        </a>
        <div className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity size={18} /> Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'learning' ? 'active' : ''}`} 
            onClick={() => setActiveTab('learning')}
          >
            <BookOpen size={18} /> Learning
          </button>
          <button 
            className={`nav-btn ${activeTab === 'simulation' ? 'active' : ''}`} 
            onClick={() => setActiveTab('simulation')}
          >
            <MessageSquare size={18} /> Sim Practice
          </button>
          <button 
            className={`nav-btn ${activeTab === 'self-care' ? 'active' : ''}`} 
            onClick={() => setActiveTab('self-care')}
          >
            <Heart size={18} /> Self-Care
          </button>
          <button 
            className={`nav-btn ${activeTab === 'resources' ? 'active' : ''}`} 
            onClick={() => setActiveTab('resources')}
          >
            <FolderOpen size={18} /> Resources
          </button>
          
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="container">
        
        {/* ==================== DASHBOARD TAB ==================== */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="card">
              <h2 className="card-title">Welcome back, Educator</h2>
              <p className="card-subtitle">Empowering student trust and co-regulation using brain science and Behavior Skills Training (BST).</p>
              
              <div className="grid-3" style={{ marginTop: '2rem' }}>
                <div className="dashboard-stat-card">
                  <CheckCircle className="icon-sage" size={32} style={{ color: 'var(--primary)', margin: '0 auto' }} />
                  <div className="dashboard-stat-value">4</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Simulations Completed</div>
                </div>
                <div className="dashboard-stat-card">
                  <Heart className="icon-sage" size={32} style={{ color: 'var(--accent)', margin: '0 auto' }} />
                  <div className="dashboard-stat-value">92%</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Regulating Success</div>
                </div>
                <div className="dashboard-stat-card">
                  <TrendingUp className="icon-sage" size={32} style={{ color: 'var(--secondary)', margin: '0 auto' }} />
                  <div className="dashboard-stat-value">2 / 3</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lessons Completed</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              {/* Simulation Quick Start */}
              <div className="card" style={{ marginBottom: 0 }}>
                <h3 className="card-title" style={{ fontSize: '1.4rem' }}>Quick Simulation Launch</h3>
                <p className="card-subtitle">Rehearse student interactions and build confidence dealing with challenging classroom behavior.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {personas.map(p => (
                    <div key={p.id} className="option-card" onClick={() => { startSimulation(p.id); setActiveTab('simulation'); }}>
                      <User size={20} style={{ color: 'var(--primary)' }} />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: '600' }}>{p.name} <span style={{ fontWeight: 'normal', fontSize: '0.85rem', color: 'var(--text-muted)' }}>(Age {p.age})</span></div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.difficulty_level} Difficulty</div>
                      </div>
                      <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Tip Card */}
              <div className="card" style={{ marginBottom: 0, background: 'linear-gradient(135deg, var(--card-bg), rgba(var(--primary-rgb), 0.03))' }}>
                <h3 className="card-title" style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>Daily Co-Regulation Tip</h3>
                <p style={{ fontStyle: 'italic', margin: '1rem 0', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  "A dysregulated adult cannot regulate a dysregulated child. Before responding to a student behavior that triggers your stress response, practice a 3-second box breath to anchor your tone of voice. Volume control is our strongest co-regulation tool."
                </p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Brain Science Fact</span>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('self-care')}>
                    Breathe Now <Heart size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== LEARNING MODULES TAB ==================== */}
        {activeTab === 'learning' && (
          <div>
            {!activeLesson ? (
              <div>
                <div className="card">
                  <h2 className="card-title">Learning Center</h2>
                  <p className="card-subtitle">Master the psychological and neurological concepts underpinning child co-regulation and response structures.</p>
                </div>

                <div className="grid-3">
                  {modules.map((m, i) => (
                    <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          backgroundColor: m.status === 'completed' ? 'var(--success-light)' : m.status === 'in_progress' ? 'var(--warning-light)' : 'var(--border)',
                          color: m.status === 'completed' ? 'var(--success)' : m.status === 'in_progress' ? 'var(--warning)' : 'var(--text-muted)'
                        }}>
                          {m.status.replace('_', ' ')}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Module {i+1}</span>
                      </div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)' }}>{m.title}</h3>
                      <p style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{m.description}</p>
                      
                      <button 
                        className="btn btn-primary" 
                        style={{ marginTop: '1.5rem', width: '100%' }} 
                        onClick={() => setActiveLesson(m)}
                      >
                        Start Learning <BookOpen size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Active Lesson Workspace
              <div className="card">
                <button className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => { setActiveLesson(null); setFlipCard(false); }}>
                  &larr; Back to Modules
                </button>
                
                <h2 className="card-title">{activeLesson.title}</h2>
                <p className="card-subtitle">Read the card below, then click to flip and review the core scientific principle.</p>

                {activeLesson.id === 'empathy_101' && (
                  <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
                    <div 
                      onClick={() => setFlipCard(!flipCard)}
                      style={{
                        backgroundColor: flipCard ? 'var(--primary-light)' : 'var(--card-bg)',
                        border: '2px dashed var(--primary)',
                        borderRadius: 'var(--radius)',
                        padding: '3rem 2rem',
                        cursor: 'pointer',
                        minHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: 'var(--shadow)',
                        transition: 'transform 0.4s ease'
                      }}
                    >
                      {!flipCard ? (
                        <div>
                          <Heart size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                          <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Empathy & Validation</h3>
                          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Why must validation always precede directing behavior?</p>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'block', marginTop: '1.5rem' }}>Click to Flip &rarr;</span>
                        </div>
                      ) : (
                        <div>
                          <Sparkles size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
                          <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>The Brain Science Principle</h3>
                          <p style={{ marginTop: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
                            When a child is dysregulated, the amygdala (fear center) is active, blocking access to the prefrontal cortex (logic center). Attempting to reason or demand limits directly will fail because the child physically cannot process logical limits. Validation of their emotion sends a neural signal of safety, down-regulating the amygdala and restoring executive function.
                          </p>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '1rem' }}>Click to Flip &larr;</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeLesson.id === 'limits_101' && (
                  <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
                    <div 
                      onClick={() => setFlipCard(!flipCard)}
                      style={{
                        backgroundColor: flipCard ? 'var(--accent-light)' : 'var(--card-bg)',
                        border: '2px dashed var(--accent)',
                        borderRadius: 'var(--radius)',
                        padding: '3rem 2rem',
                        cursor: 'pointer',
                        minHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: 'var(--shadow)',
                        transition: 'transform 0.4s ease'
                      }}
                    >
                      {!flipCard ? (
                        <div>
                          <CheckCircle size={48} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
                          <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Kind Limit Setting</h3>
                          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>How do we set limits clearly without resorting to power dynamics?</p>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', display: 'block', marginTop: '1.5rem' }}>Click to Flip &rarr;</span>
                        </div>
                      ) : (
                        <div>
                          <Sparkles size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                          <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}>The Brain Science Principle</h3>
                          <p style={{ marginTop: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
                            Limits should follow the structure: **[Empathy/Validation] + [State the rule/limit kindly] + [Provide regulated choices]**. 
                            For example: "I see you're not ready to work Maya. And it's math time now. Do you want to do the odd numbers or the even numbers?" This maintains safety while establishing structure, empowering self-regulation.
                          </p>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '1rem' }}>Click to Flip &larr;</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeLesson.id === 'traps_101' && (
                  <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
                    <div 
                      onClick={() => setFlipCard(!flipCard)}
                      style={{
                        backgroundColor: flipCard ? 'var(--primary-light)' : 'var(--card-bg)',
                        border: '2px dashed var(--primary)',
                        borderRadius: 'var(--radius)',
                        padding: '3rem 2rem',
                        cursor: 'pointer',
                        minHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: 'var(--shadow)',
                        transition: 'transform 0.4s ease'
                      }}
                    >
                      {!flipCard ? (
                        <div>
                          <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
                          <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Spotting Response Traps</h3>
                          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>What are response traps and why are they counter-productive?</p>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'block', marginTop: '1.5rem' }}>Click to Flip &rarr;</span>
                        </div>
                      ) : (
                        <div>
                          <ShieldAlert size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
                          <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--danger)', fontFamily: 'var(--font-heading)' }}>The Response Traps</h3>
                          <p style={{ marginTop: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
                            Response traps include **Coercion** (making threats of exclusion), **Sarcasm** (passive aggression), and **Pleading**. These responses raise the stress chemicals in the child's body, triggering escalation. If a child's stress level escalates, the likelihood of aggression or shut down increases significantly.
                          </p>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '1rem' }}>Click to Flip &larr;</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== SIMULATION PRACTICE TAB ==================== */}
        {activeTab === 'simulation' && (
          <div>
            {!activeSim ? (
              // Persona Selection Screen
              <div>
                <div className="card">
                  <h2 className="card-title">Interactive AI student Simulator</h2>
                  <p className="card-subtitle">Select a student profile below to initiate a live simulation. Try to validate their feelings, state direct boundaries, and de-escalate their stress levels.</p>
                </div>
                
                <div className="grid-3">
                  {personas.map(p => (
                    <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '700', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          backgroundColor: p.difficulty_level === 'Beginner' ? 'var(--success-light)' : p.difficulty_level === 'Intermediate' ? 'var(--warning-light)' : 'var(--danger-light)',
                          color: p.difficulty_level === 'Beginner' ? 'var(--success)' : p.difficulty_level === 'Intermediate' ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          {p.difficulty_level}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Age {p.age}</span>
                      </div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)' }}>{p.name}</h3>
                      <p style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{p.profile_details}</p>
                      
                      <button 
                        className="btn btn-primary" 
                        style={{ marginTop: '1.5rem', width: '100%' }} 
                        onClick={() => startSimulation(p.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Starting...' : 'Start Practice'} &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Active Dialogue Workspace
              <div className="sim-container">
                {/* Left Sidebar Info */}
                <div className="sim-sidebar">
                  <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>{activeSim.persona.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {activeSim.persona.difficulty_level} Level (Age {activeSim.persona.age})
                  </span>
                  
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
                  
                  {/* Dynamic Stress Meter */}
                  <div className="stress-meter-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }}>
                      <span>Student Stress:</span>
                      <span style={{ 
                        color: activeSim.escalation_score < 35 ? 'var(--success)' : activeSim.escalation_score < 75 ? 'var(--warning)' : 'var(--danger)' 
                      }}>
                        {activeSim.escalation_score}%
                      </span>
                    </div>
                    <div className="stress-meter-track">
                      <div 
                        className={`stress-meter-fill ${getStressMeterClass(activeSim.escalation_score)}`}
                        style={{ width: `${activeSim.escalation_score}%` }}
                      ></div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                      Status: {getStressStatus(activeSim.escalation_score)}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

                  {/* Persona instructions reminder */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    <h4 style={{ margin: '0 0 0.4rem 0', fontWeight: '600', color: 'var(--text)' }}>Objective:</h4>
                    Validate the feelings, avoid sarcasms/threats, and set clear limits to bring the stress levels under **20%**.
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: 'auto', padding: '0.5rem' }} 
                    onClick={evaluateSimulation}
                    disabled={isLoading}
                  >
                    Finish & Get Feedback
                  </button>
                </div>

                {/* Right Chat Panel */}
                <div className="sim-main">
                  <div className="chat-messages">
                    {activeSim.messages.map(m => (
                      <div key={m.id} className={`message-bubble ${m.sender}`}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                          {m.sender === 'student' ? activeSim.persona.name : 'Educator (You)'}
                        </div>
                        {m.content}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="message-bubble student" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                        {activeSim.persona.name} is reacting...
                      </div>
                    )}
                  </div>

                  {/* Scaffolding Dialogue Options (Multiple Choice Practice helper) */}
                  <div style={{ padding: '0 1.5rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0', fontWeight: 'bold' }}>
                      Scaffolded Practice Choices (Click one to send or type custom response below):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', paddingBottom: '0.5rem' }}>
                      {dialogueScaffolds[activeSim.persona.name]?.map((opt, i) => (
                        <button 
                          key={i}
                          className="btn btn-secondary" 
                          style={{ 
                            fontSize: '0.8rem', 
                            textAlign: 'left', 
                            padding: '0.5rem 0.75rem', 
                            display: 'block', 
                            whiteSpace: 'normal',
                            height: 'auto',
                            lineHeight: '1.3'
                          }}
                          onClick={() => submitStep(opt.text)}
                          disabled={isLoading}
                        >
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: opt.type === 'expert' ? 'var(--success)' : 'var(--danger)', display: 'block', marginBottom: '0.2rem' }}>
                            {opt.text_type}
                          </span>
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat input box */}
                  <form 
                    className="chat-input-area" 
                    onSubmit={(e) => { e.preventDefault(); submitStep(chatInput); }}
                  >
                    <input 
                      type="text" 
                      className="chat-input" 
                      placeholder="Type your regulating response..." 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isLoading}
                    />
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ padding: '0.75rem 1rem' }}
                      disabled={isLoading || !chatInput.trim()}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== COACHING FEEDBACK TAB ==================== */}
        {activeTab === 'feedback' && feedback && (
          <div className="card">
            <h2 className="card-title">Coaching Report</h2>
            <p className="card-subtitle">Behavior Skills Training (BST) Performance Analysis & Feedback.</p>

            <div className="grid-2" style={{ marginTop: '2rem' }}>
              
              {/* Left Column: Visual Scoring Charts */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginBottom: '1.5rem' }}>Skills Evaluation</h3>
                
                {/* SVG Radial Radar / Progress representation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                      <span>Empathy & Validation</span>
                      <span>{feedback.empathy_score}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${feedback.empathy_score}%`, backgroundColor: 'var(--primary)' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                      <span>Kind Boundary Clear Setting</span>
                      <span>{feedback.boundary_score}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${feedback.boundary_score}%`, backgroundColor: 'var(--accent)' }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'rgba(var(--primary-rgb), 0.01)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)' }}>Performance Comparison:</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{feedback.expert_comparison}</p>
                </div>
              </div>

              {/* Right Column: Traps Identified & Recommendations */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--danger)', marginBottom: '1.5rem' }}>Response Trap Breakdown</h3>
                
                {feedback.traps_identified.length === 0 ? (
                  <div className="success-callout">
                    <h4>No Traps Detected!</h4>
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>Excellent. You avoided sarcasm, coercion, and pleading throughout the dialogue.</p>
                  </div>
                ) : (
                  <div>
                    {feedback.traps_identified.map(trap => (
                      <div key={trap} className="trap-callout">
                        <h4 style={{ textTransform: 'capitalize' }}><AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.4rem' }} /> {trap} Trap detected</h4>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>{feedback.traps_justification[trap]}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="card" style={{ padding: '1.25rem', marginTop: '1rem', borderTop: '4px solid var(--primary)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>Constructive Coaching Advice:</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{feedback.constructive_advice}</p>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setActiveTab('simulation')}>
                Practice Another Scenario <RotateCcw size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ==================== SELF-CARE TAB ==================== */}
        {activeTab === 'self-care' && (
          <div className="grid-2">
            
            {/* Box Breathing Guide */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 className="card-title">Box Breathing Regulator</h2>
              <p className="card-subtitle" style={{ textAlign: 'center' }}>Calm your autonomic nervous system to anchor your co-regulation capacity.</p>
              
              <div className="breathing-box" style={{ width: '100%', marginTop: '1rem' }}>
                <div className="breathing-circle-outer">
                  <div className={`breathing-circle-inner b-${breathState}`}>
                    {isBreathing ? `${breathCountdown}s` : <Heart size={32} style={{ color: 'white' }} />}
                  </div>
                </div>
                
                <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 0.5rem 0' }}>{breathText}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {isBreathing ? breathState.replace('-', ' ') : 'Ready'}
                </p>

                <button 
                  className={`btn ${isBreathing ? 'btn-secondary' : 'btn-primary'}`} 
                  style={{ marginTop: '2rem' }}
                  onClick={() => setIsBreathing(!isBreathing)}
                >
                  {isBreathing ? 'Stop Session' : 'Start Breathing'}
                </button>
              </div>
            </div>

            {/* Mood Logger & History */}
            <div className="card">
              <h2 className="card-title">Stress & Regulation Diary</h2>
              <p className="card-subtitle">Log your current regulation states to track stress triggers over time.</p>
              
              <form onSubmit={submitSelfCare} style={{ marginTop: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Your Current Stress/Regulation Level:</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <button 
                        key={num} 
                        type="button" 
                        className={`btn ${moodScore === num ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '0.5rem' }}
                        onClick={() => setMoodScore(num)}
                      >
                        {num === 1 ? 'Overwhelmed' : num === 3 ? 'Neutral' : num === 5 ? 'Regulated' : num}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reflection Notes:</label>
                  <textarea 
                    className="chat-input" 
                    style={{ width: '100%', minHeight: '80px', borderRadius: 'var(--radius-sm)', resize: 'vertical' }}
                    placeholder="What triggered your stress today? How did you respond?"
                    value={careNotes}
                    onChange={(e) => setCareNotes(e.target.value)}
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
                  Log Entry <FileText size={16} />
                </button>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

              <h4 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 0.75rem 0' }}>Log History:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                {careLogs.map(log => (
                  <div key={log.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', backgroundColor: 'rgba(var(--primary-rgb), 0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>{log.activity_type}</span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Regulation Score: {log.mood_score} / 5</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{log.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== RESOURCES TAB ==================== */}
        {activeTab === 'resources' && (
          <div className="card">
            <h2 className="card-title">Printable Resources & Science Sheets</h2>
            <p className="card-subtitle">Searchable summaries and classroom materials based on educational psychology.</p>

            <div className="grid-2" style={{ marginTop: '2rem' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>Printable Visual Supports</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Download high-resolution, design-friendly classroom tools to support student self-regulation hubs.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <a href="#" className="option-card" onClick={(e) => e.preventDefault()}>
                    <FileText size={18} />
                    <span style={{ fontSize: '0.9rem', textAlign: 'left', flex: 1 }}>Calm Down Corner Breathing Guide Poster</span>
                  </a>
                  <a href="#" className="option-card" onClick={(e) => e.preventDefault()}>
                    <FileText size={18} />
                    <span style={{ fontSize: '0.9rem', textAlign: 'left', flex: 1 }}>Co-Regulation Step-by-Step Desk Visual</span>
                  </a>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)', color: 'var(--secondary)' }}>Brain Science Summaries</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Short, plain-language reference cards detailing the neurobiology of behavioral regulation.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <a href="#" className="option-card" onClick={(e) => e.preventDefault()}>
                    <FileText size={18} />
                    <span style={{ fontSize: '0.9rem', textAlign: 'left', flex: 1 }}>The Amygdala Hijack: Trauma-Informed Classroom Care</span>
                  </a>
                  <a href="#" className="option-card" onClick={(e) => e.preventDefault()}>
                    <FileText size={18} />
                    <span style={{ fontSize: '0.9rem', textAlign: 'left', flex: 1 }}>Behavior Skills Training (BST) Research Framework</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
