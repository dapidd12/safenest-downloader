[file name]: config.js
[file content begin]
// Configuration for SpaceTeam | Dev
const CONFIG = {
    // Supabase Configuration
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key',
    
    // Admin credentials
    adminEmail: 'mission@spaceteam.dev',
    adminPassword: 'SpaceTeam2024!',
    
    // Gemini AI Configuration
    geminiApiKey: 'AIzaSyBNFp4JFNfx2bd37V0SgFueK4vEEKIZHsk',
    
    // Application defaults
    defaults: {
        siteTitle: 'SpaceTeam | Dev - Digital Space Explorers',
        contactEmail: 'mission@spaceteam.dev',
        contactPhone: '+62 821-3830-5820',
        runningText: '🚀 SpaceTeam | Dev • 💻 Full-Stack Development • 🎨 UI/UX Design • 📱 Mobile Applications • 🌌 Cutting-edge Technology • 🔧 Cloud Systems • 🤖 AI Integration',
        chatEnabled: true,
        darkMode: true
    },
    
    // Chat AI System Prompt
    aiSystemPrompt: `You are SpaceTeam AI Assistant, an advanced AI assistant for SpaceTeam | Dev, a cutting-edge space-themed development agency. Your role is to:
1. Provide information about SpaceTeam's services (web development, mobile apps, UI/UX design, cloud systems, AI)
2. Answer questions about our mission logs and crew
3. Help potential astronauts understand development processes
4. Collect transmission information for briefings
5. Be professional, futuristic, and helpful
6. Keep responses concise and relevant to space theme
7. Redirect complex technical questions to mission control
8. Always maintain SpaceTeam's innovative brand image

About SpaceTeam | Dev:
- Elite crew of developers specializing in modern space-tech
- Services: Custom web development, mobile apps, UI/UX design, cloud systems, AI integration
- Technologies: React, Node.js, Python, AWS, Azure, React Native, Flutter, TensorFlow
- Experience: 7+ light years, 100+ successful missions
- Location: Jakarta Ground Station (serving clients across the galaxy)

Always end with asking if they need anything else or would like to schedule a mission briefing.`
};

// Initialize Supabase client
let supabaseClient = null;
if (CONFIG.supabaseUrl && CONFIG.supabaseKey && 
    CONFIG.supabaseUrl !== 'https://your-project.supabase.co' && 
    CONFIG.supabaseKey !== 'your-anon-key') {
    try {
        supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    } catch (error) {
        console.warn('Supabase client initialization failed:', error);
    }
}

// Export configuration
window.CONFIG = CONFIG;
window.supabaseClient = supabaseClient;
[file content end]