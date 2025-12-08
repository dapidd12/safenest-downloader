[file name]: app.js
[file content begin]
// Main Application - SpaceTeam | Dev - FIXED VERSION
class SpaceTeamApp {
    constructor() {
        try {
            // Fix: Proper dark mode initialization
            const savedDarkMode = localStorage.getItem('darkMode');
            const defaultDarkMode = true; // Default to dark mode
            
            // Get saved language or use default
            const savedLanguage = localStorage.getItem('language') || CONFIG.defaultLanguage;
            
            this.state = {
                darkMode: savedDarkMode !== null ? savedDarkMode === 'true' : defaultDarkMode,
                language: savedLanguage,
                chatOpen: false,
                isAdmin: false,
                currentAdminSection: 'dashboard',
                editingId: null,
                developers: [],
                projects: [],
                websiteProjects: [],
                blogPosts: [],
                settings: {},
                messages: [],
                chatMessages: [],
                skillsChart: null,
                projectIdCounter: 1,
                developerIdCounter: 1,
                websiteIdCounter: 1,
                blogIdCounter: 1,
                messageIdCounter: 1,
                resizeObserver: null,
                chartObserver: null,
                loadingStartTime: null,
                isMobileMenuOpen: false
            };

            // Bind methods to maintain context
            this.init = this.init.bind(this);
            this.toggleDarkMode = this.toggleDarkMode.bind(this);
            this.toggleMobileMenu = this.toggleMobileMenu.bind(this);
            this.closeMobileMenu = this.closeMobileMenu.bind(this);
            this.handleContactSubmit = this.handleContactSubmit.bind(this);
            this.handleAdminLogin = this.handleAdminLogin.bind(this);
            this.toggleChat = this.toggleChat.bind(this);
            this.sendChatMessage = this.sendChatMessage.bind(this);
            this.showAdminSection = this.showAdminSection.bind(this);
            this.switchAdminTab = this.switchAdminTab.bind(this);
            this.handleDeveloperFormSubmit = this.handleDeveloperFormSubmit.bind(this);
            this.handleProjectFormSubmit = this.handleProjectFormSubmit.bind(this);
            this.handleWebsiteFormSubmit = this.handleWebsiteFormSubmit.bind(this);
            this.handleBlogFormSubmit = this.handleBlogFormSubmit.bind(this);
            this.handleSettingsFormSubmit = this.handleSettingsFormSubmit.bind(this);
            this.switchLanguage = this.switchLanguage.bind(this);
            this.updateLanguage = this.updateLanguage.bind(this);
            this.handleNavClick = this.handleNavClick.bind(this);
            this.handleScroll = this.handleScroll.bind(this);
            this.initLazyLoading = this.initLazyLoading.bind(this);
            this.safeParseJSON = this.safeParseJSON.bind(this);
            
            this.init();
        } catch (error) {
            console.error('App constructor error:', error);
            throw error;
        }
    }

    async init() {
        try {
            // Set current year
            const yearElement = document.getElementById('current-year');
            if (yearElement) {
                yearElement.textContent = new Date().getFullYear();
            }
            
            // Apply dark mode if enabled
            if (this.state.darkMode) {
                document.body.classList.add('dark-theme');
                const themeIcon = document.querySelector('#theme-toggle i');
                if (themeIcon) {
                    themeIcon.className = 'fas fa-sun';
                }
            }
            
            // Apply language
            await this.updateLanguage(this.state.language);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load data
            await this.loadData();
            
            // Initialize UI
            this.initUI();
            
            // Check admin session
            this.checkAdminSession();
            
            // Setup animations
            this.setupScrollAnimations();
            this.setupScrollProgress();
            
            // Initialize lazy loading
            this.initLazyLoading();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Error initializing application', 'error');
        }
    }

    async loadData() {
        this.state.loadingStartTime = Date.now();
        this.showLoading();
        
        // Add minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        try {
            // Try to load from Supabase first
            if (window.supabaseClient && CONFIG.supabaseUrl !== 'https://your-project.supabase.co') {
                await this.loadFromSupabase();
            } else {
                // Fallback to localStorage
                this.loadFromLocalStorage();
                this.showNotification('Using local storage mode. Set up Supabase for cloud storage.', 'warning');
            }
            
            // Update UI with loaded data
            this.updateUI();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.loadFromLocalStorage();
            this.updateUI();
            this.showNotification('Failed to load cloud data. Using local storage.', 'warning');
        } finally {
            // Ensure minimum loading time of 1 second for good UX
            const elapsed = Date.now() - this.state.loadingStartTime;
            const remaining = Math.max(1000 - elapsed, 0);
            setTimeout(() => this.hideLoading(), remaining);
        }
    }

    async loadFromSupabase() {
        try {
            // Load developers
            const { data: developers, error: devError } = await supabaseClient
                .from('developers')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (devError) throw devError;
            this.state.developers = developers || [];
            this.state.developerIdCounter = this.state.developers.length > 0 
                ? Math.max(...this.state.developers.map(d => d.id || 0), 0) + 1 
                : 1;
            
            // Load projects
            const { data: projects, error: projError } = await supabaseClient
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (projError) throw projError;
            this.state.projects = projects || [];
            this.state.projectIdCounter = this.state.projects.length > 0
                ? Math.max(...this.state.projects.map(p => p.id || 0), 0) + 1
                : 1;
            
            // Load website projects
            const { data: websiteProjects, error: websiteError } = await supabaseClient
                .from('website_projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (websiteError) throw websiteError;
            this.state.websiteProjects = websiteProjects || [];
            this.state.websiteIdCounter = this.state.websiteProjects.length > 0
                ? Math.max(...this.state.websiteProjects.map(w => w.id || 0), 0) + 1
                : 1;
            
            // Load blog posts
            const { data: blogPosts, error: blogError } = await supabaseClient
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (blogError) throw blogError;
            this.state.blogPosts = blogPosts || [];
            this.state.blogIdCounter = this.state.blogPosts.length > 0
                ? Math.max(...this.state.blogPosts.map(b => b.id || 0), 0) + 1
                : 1;
            
            // Load settings
            let settingsData = null;
            try {
                const { data: settings, error: settingsError } = await supabaseClient
                    .from('settings')
                    .select('*')
                    .single();
                
                if (!settingsError) {
                    settingsData = settings;
                }
            } catch (e) {
                // Settings table might not exist
                console.log('Settings table not found, using defaults');
            }
            
            this.state.settings = settingsData || { ...CONFIG.defaults, ...JSON.parse(localStorage.getItem('spaceteam_settings') || '{}') };
            
            // Load messages
            const { data: messages, error: msgError } = await supabaseClient
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (msgError) throw msgError;
            this.state.messages = messages || [];
            this.state.messageIdCounter = this.state.messages.length > 0
                ? Math.max(...this.state.messages.map(m => m.id || 0), 0) + 1
                : 1;
            
        } catch (error) {
            console.error('Supabase loading error:', error);
            throw error;
        }
    }

    loadFromLocalStorage() {
        this.state.developers = this.safeParseJSON(localStorage.getItem('spaceteam_developers')) || [];
        this.state.projects = this.safeParseJSON(localStorage.getItem('spaceteam_projects')) || [];
        this.state.websiteProjects = this.safeParseJSON(localStorage.getItem('spaceteam_websites')) || [];
        this.state.blogPosts = this.safeParseJSON(localStorage.getItem('spaceteam_blog')) || [];
        this.state.settings = this.safeParseJSON(localStorage.getItem('spaceteam_settings')) || { ...CONFIG.defaults };
        this.state.messages = this.safeParseJSON(localStorage.getItem('spaceteam_messages')) || [];
        
        // Update ID counters safely
        this.state.developerIdCounter = this.state.developers.length > 0
            ? Math.max(...this.state.developers.map(d => d.id || 0), 0) + 1
            : 1;
        this.state.projectIdCounter = this.state.projects.length > 0
            ? Math.max(...this.state.projects.map(p => p.id || 0), 0) + 1
            : 1;
        this.state.websiteIdCounter = this.state.websiteProjects.length > 0
            ? Math.max(...this.state.websiteProjects.map(w => w.id || 0), 0) + 1
            : 1;
        this.state.blogIdCounter = this.state.blogPosts.length > 0
            ? Math.max(...this.state.blogPosts.map(b => b.id || 0), 0) + 1
            : 1;
        this.state.messageIdCounter = this.state.messages.length > 0
            ? Math.max(...this.state.messages.map(m => m.id || 0), 0) + 1
            : 1;
    }

    safeParseJSON(str) {
        try {
            return JSON.parse(str) || [];
        } catch (e) {
            console.error('Error parsing JSON:', e);
            return [];
        }
    }

    async saveToSupabase(table, data) {
        if (!window.supabaseClient || CONFIG.supabaseUrl === 'https://your-project.supabase.co') {
            return this.saveToLocalStorage(table, data);
        }

        try {
            let result;
            
            if (Array.isArray(data)) {
                // For bulk updates (used for initial sync)
                if (data.length === 0) return true;
                
                // Clear all and insert new data for reset operations
                const { error: deleteError } = await supabaseClient
                    .from(table)
                    .delete()
                    .neq('id', 0); // Delete all records
                
                if (deleteError) throw deleteError;
                
                if (data.length > 0) {
                    const { error: insertError } = await supabaseClient
                        .from(table)
                        .insert(data);
                    
                    if (insertError) throw insertError;
                }
                
                result = true;
            } else {
                // Single record - upsert
                const { error } = await supabaseClient
                    .from(table)
                    .upsert([data], { onConflict: 'id' });
                
                if (error) throw error;
                result = true;
            }
            
            return result;
        } catch (error) {
            console.error(`Error saving to ${table}:`, error);
            // Fallback to localStorage
            return this.saveToLocalStorage(table, data);
        }
    }

    async deleteFromSupabase(table, id) {
        if (!window.supabaseClient || CONFIG.supabaseUrl === 'https://your-project.supabase.co') {
            return this.deleteFromLocalStorage(table, id);
        }

        try {
            const { error } = await supabaseClient
                .from(table)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`Error deleting from ${table}:`, error);
            // Fallback to localStorage
            return this.deleteFromLocalStorage(table, id);
        }
    }

    saveToLocalStorage(table, data) {
        try {
            switch(table) {
                case 'developers':
                    if (Array.isArray(data)) {
                        localStorage.setItem('spaceteam_developers', JSON.stringify(data));
                        this.state.developers = data;
                    } else {
                        let developers = [...this.state.developers];
                        const index = developers.findIndex(d => d.id === data.id);
                        if (index >= 0) {
                            developers[index] = data;
                        } else {
                            developers.push(data);
                        }
                        localStorage.setItem('spaceteam_developers', JSON.stringify(developers));
                        this.state.developers = developers;
                    }
                    break;
                    
                case 'projects':
                    if (Array.isArray(data)) {
                        localStorage.setItem('spaceteam_projects', JSON.stringify(data));
                        this.state.projects = data;
                    } else {
                        let projects = [...this.state.projects];
                        const index = projects.findIndex(p => p.id === data.id);
                        if (index >= 0) {
                            projects[index] = data;
                        } else {
                            projects.push(data);
                        }
                        localStorage.setItem('spaceteam_projects', JSON.stringify(projects));
                        this.state.projects = projects;
                    }
                    break;
                    
                case 'website_projects':
                    if (Array.isArray(data)) {
                        localStorage.setItem('spaceteam_websites', JSON.stringify(data));
                        this.state.websiteProjects = data;
                    } else {
                        let websites = [...this.state.websiteProjects];
                        const index = websites.findIndex(w => w.id === data.id);
                        if (index >= 0) {
                            websites[index] = data;
                        } else {
                            websites.push(data);
                        }
                        localStorage.setItem('spaceteam_websites', JSON.stringify(websites));
                        this.state.websiteProjects = websites;
                    }
                    break;
                    
                case 'blog_posts':
                    if (Array.isArray(data)) {
                        localStorage.setItem('spaceteam_blog', JSON.stringify(data));
                        this.state.blogPosts = data;
                    } else {
                        let blogPosts = [...this.state.blogPosts];
                        const index = blogPosts.findIndex(b => b.id === data.id);
                        if (index >= 0) {
                            blogPosts[index] = data;
                        } else {
                            blogPosts.push(data);
                        }
                        localStorage.setItem('spaceteam_blog', JSON.stringify(blogPosts));
                        this.state.blogPosts = blogPosts;
                    }
                    break;
                    
                case 'settings':
                    const mergedSettings = { ...this.state.settings, ...data };
                    localStorage.setItem('spaceteam_settings', JSON.stringify(mergedSettings));
                    this.state.settings = mergedSettings;
                    break;
                    
                case 'messages':
                    if (Array.isArray(data)) {
                        localStorage.setItem('spaceteam_messages', JSON.stringify(data));
                        this.state.messages = data;
                    } else {
                        let messages = [...this.state.messages];
                        messages.unshift(data);
                        if (messages.length > 100) messages = messages.slice(0, 100);
                        localStorage.setItem('spaceteam_messages', JSON.stringify(messages));
                        this.state.messages = messages;
                    }
                    break;
            }
            return true;
        } catch (error) {
            console.error(`Error saving to localStorage for ${table}:`, error);
            return false;
        }
    }

    deleteFromLocalStorage(table, id) {
        try {
            switch(table) {
                case 'developers':
                    const developers = this.state.developers.filter(d => d.id !== id);
                    localStorage.setItem('spaceteam_developers', JSON.stringify(developers));
                    this.state.developers = developers;
                    break;
                    
                case 'projects':
                    const projects = this.state.projects.filter(p => p.id !== id);
                    localStorage.setItem('spaceteam_projects', JSON.stringify(projects));
                    this.state.projects = projects;
                    break;
                    
                case 'website_projects':
                    const websites = this.state.websiteProjects.filter(w => w.id !== id);
                    localStorage.setItem('spaceteam_websites', JSON.stringify(websites));
                    this.state.websiteProjects = websites;
                    break;
                    
                case 'blog_posts':
                    const blogPosts = this.state.blogPosts.filter(b => b.id !== id);
                    localStorage.setItem('spaceteam_blog', JSON.stringify(blogPosts));
                    this.state.blogPosts = blogPosts;
                    break;
                    
                case 'messages':
                    const messages = this.state.messages.filter(m => m.id !== id);
                    localStorage.setItem('spaceteam_messages', JSON.stringify(messages));
                    this.state.messages = messages;
                    break;
            }
            return true;
        } catch (error) {
            console.error(`Error deleting from localStorage for ${table}:`, error);
            return false;
        }
    }

    updateUI() {
        // Apply settings
        this.applySettings();
        
        // Render data
        this.renderDevelopers();
        this.renderProjects();
        this.renderWebsiteProjects();
        this.renderBlogPosts();
        this.updateStats();
        
        // Initialize skills chart
        this.initSkillsChart();
        
        // Initialize lazy loading for new images
        this.initLazyLoading();
    }

    applySettings() {
        // Apply running text
        const runningText = this.state.settings.runningText?.[this.state.language] || 
                          CONFIG.defaults.runningText[this.state.language] || 
                          CONFIG.defaults.runningText.en;
        const runningTextElement = document.getElementById('running-text');
        if (runningTextElement) {
            runningTextElement.textContent = runningText;
        }
        
        // Apply site title
        const siteTitle = this.state.settings.siteTitle?.[this.state.language] || 
                         CONFIG.defaults.siteTitle[this.state.language] || 
                         CONFIG.defaults.siteTitle.en;
        document.title = siteTitle;
        
        // Apply contact info
        const contactEmail = this.state.settings.contactEmail || CONFIG.defaults.contactEmail;
        const contactPhone = this.state.settings.contactPhone || CONFIG.defaults.contactPhone;
        
        const emailDisplay = document.getElementById('contact-email-display');
        const phoneDisplay = document.getElementById('contact-phone-display');
        const footerEmail = document.getElementById('footer-email');
        const footerPhone = document.getElementById('footer-phone');
        
        if (emailDisplay) emailDisplay.textContent = contactEmail;
        if (phoneDisplay) phoneDisplay.textContent = contactPhone;
        if (footerEmail) footerEmail.textContent = contactEmail;
        if (footerPhone) footerPhone.textContent = contactPhone;
        
        // Apply dark mode from settings
        if (this.state.settings.darkMode !== undefined && this.state.settings.darkMode !== this.state.darkMode) {
            this.toggleDarkMode();
        }
        
        // Show/hide chat based on settings
        const chatEnabled = this.state.settings.chatEnabled !== false;
        const chatToggle = document.getElementById('chat-toggle');
        if (chatToggle) {
            chatToggle.classList.toggle('hidden', !chatEnabled);
        }
    }

    async updateLanguage(lang) {
        this.state.language = lang;
        localStorage.setItem('language', lang);
        
        // Update language selector
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.value = lang;
        }
        
        // Get translations
        const translations = CONFIG.translations[lang] || CONFIG.translations.en;
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[key]) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.setAttribute('placeholder', translations[key]);
                } else {
                    element.textContent = translations[key];
                }
            }
        });
        
        // Update placeholder elements
        document.querySelectorAll('[data-i18n-ph]').forEach(element => {
            const key = element.getAttribute('data-i18n-ph');
            if (translations[key]) {
                element.setAttribute('placeholder', translations[key]);
            }
        });
        
        // Apply settings for current language
        this.applySettings();
        
        // Re-render content with new language
        this.updateUI();
    }

    switchLanguage() {
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            const newLang = languageSelector.value;
            this.updateLanguage(newLang);
        }
    }

    renderDevelopers() {
        const container = document.getElementById('developers-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        if (this.state.developers.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1/-1; padding: var(--space-2xl);">
                    <div style="width: 80px; height: 80px; background: rgba(100, 255, 218, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-md);">
                        <i class="fas fa-user-astronaut fa-2x" style="color: var(--secondary);"></i>
                    </div>
                    <h3 style="color: var(--secondary);">${translations.emptyCrew || 'Mission Crew Assembling'}</h3>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">${translations.emptyCrewText || 'Our elite space engineers are preparing for mission. Stand by for crew manifest!'}</p>
                    ${this.state.isAdmin ? `
                        <button class="btn btn-primary" onclick="app.showAdminSection('developers')" style="margin-top: var(--space-md);">
                            <i class="fas fa-user-astronaut"></i> ${translations.emptyCrew ? 'Assign First Crew Member' : 'Assign First Crew Member'}
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        this.state.developers.forEach((dev, index) => {
            const skills = Array.isArray(dev.skills) ? dev.skills : 
                          typeof dev.skills === 'string' ? dev.skills.split(',').map(s => s.trim()) : [];
            
            const skillsHTML = skills.map(skill => 
                `<span class="skill-tag">${skill}</span>`
            ).join('');
            
            const developerHTML = `
                <div class="developer-card animate__animated animate__fadeInUp" style="animation-delay: ${index * 100}ms">
                    <div class="developer-header">
                        <img src="${dev.image || 'https://images.unsplash.com/photo-1534796636910-9c1825470300?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" 
                             alt="${dev.name}" 
                             class="developer-image"
                             loading="lazy">
                        <div class="developer-overlay">
                            <h3 class="developer-name">${dev.name}</h3>
                            <p class="developer-role">${dev.role}</p>
                        </div>
                    </div>
                    <div class="developer-content">
                        <div class="developer-skills">
                            ${skillsHTML}
                        </div>
                        <p class="developer-bio">${dev.bio}</p>
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            ${dev.email ? `<a href="mailto:${dev.email}" class="btn btn-sm btn-outline">
                                <i class="fas fa-satellite"></i> Contact
                            </a>` : ''}
                            ${dev.github ? `<a href="https://github.com/${dev.github}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fab fa-github"></i> GitHub
                            </a>` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', developerHTML);
        });
    }

    renderProjects(filter = 'all') {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        const filteredProjects = filter === 'all' 
            ? this.state.projects 
            : this.state.projects.filter(project => project.type === filter);
        
        if (filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1/-1; padding: var(--space-2xl);">
                    <div style="width: 80px; height: 80px; background: rgba(100, 255, 218, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-md);">
                        <i class="fas fa-satellite fa-2x" style="color: var(--secondary);"></i>
                    </div>
                    <h3 style="color: var(--secondary);">${translations.emptyProjects || 'Mission Log Empty'}</h3>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">
                        ${filter === 'all' 
                            ? translations.emptyProjectsText || 'No missions completed yet. Preparing for launch!' 
                            : translations[`emptyProjects${filter.charAt(0).toUpperCase() + filter.slice(1)}`] || `No ${filter} missions found. Adjust mission parameters!`}
                    </p>
                    ${this.state.isAdmin ? `
                        <button class="btn btn-primary" onclick="app.showAdminSection('projects')" style="margin-top: var(--space-md);">
                            <i class="fas fa-rocket"></i> ${translations.emptyProjects ? 'Log First Mission' : 'Log First Mission'}
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        filteredProjects.forEach((project, index) => {
            const tech = Array.isArray(project.tech) ? project.tech : 
                        typeof project.tech === 'string' ? project.tech.split(',').map(t => t.trim()) : [];
            
            const techHTML = tech.map(tech => 
                `<span class="tech-tag">${tech}</span>`
            ).join('');
            
            const typeMap = {
                'web': translations.filterWeb || 'Web Systems',
                'mobile': translations.filterMobile || 'Mobile App',
                'design': translations.filterDesign || 'UI/UX Design'
            };
            
            const projectHTML = `
                <div class="project-card animate__animated animate__fadeInUp" style="animation-delay: ${index * 100}ms">
                    <img src="${project.image || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" 
                         alt="${project.title}" 
                         class="project-image"
                         loading="lazy">
                    <div class="project-content">
                        <h3 class="project-title">${project.title}</h3>
                        <p class="project-description">${project.description}</p>
                        <div class="project-tech">
                            ${techHTML}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                            <span class="project-category">${typeMap[project.type] || project.type}</span>
                            ${project.link ? `
                                <a href="${project.link}" target="_blank" class="btn btn-sm btn-primary">
                                    <i class="fas fa-external-link-alt"></i> ${translations.btnLaunch || 'Launch'}
                                </a>
                            ` : `
                                <button class="btn btn-sm btn-primary" onclick="app.viewProjectDetails(${project.id})">
                                    <i class="fas fa-eye"></i> ${translations.btnViewDetails || 'Mission Details'}
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', projectHTML);
        });
    }

    renderWebsiteProjects() {
        const container = document.getElementById('websites-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        if (this.state.websiteProjects.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1/-1; padding: var(--space-xl);">
                    <div style="width: 80px; height: 80px; background: rgba(100, 255, 218, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-md);">
                        <i class="fas fa-globe fa-2x" style="color: var(--secondary);"></i>
                    </div>
                    <h3 style="color: var(--secondary);">${translations.emptyWebsites || 'No Websites Deployed'}</h3>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">${translations.emptyWebsitesText || 'No website projects have been deployed yet.'}</p>
                    ${this.state.isAdmin ? `
                        <button class="btn btn-primary" onclick="app.showAdminSection('websites')" style="margin-top: var(--space-md);">
                            <i class="fas fa-cloud-upload-alt"></i> ${translations.emptyWebsites ? 'Deploy First Website' : 'Deploy First Website'}
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        this.state.websiteProjects.forEach((website, index) => {
            const statusText = {
                'live': translations.websiteStatusLive || '🚀 Live',
                'maintenance': translations.websiteStatusMaintenance || '🚧 Maintenance',
                'development': translations.websiteStatusDev || '👨‍💻 Development'
            };
            
            const websiteHTML = `
                <div class="website-card animate__animated animate__fadeInUp" style="animation-delay: ${index * 100}ms">
                    <div class="website-preview">
                        <img src="${website.screenshot || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" 
                             alt="${website.title}" 
                             class="website-image"
                             loading="lazy">
                        <div class="website-status ${website.status || 'live'}">
                            <span>${statusText[website.status] || statusText.live}</span>
                        </div>
                    </div>
                    <div class="website-content">
                        <h3 class="website-title">${website.title}</h3>
                        <p class="website-description">${website.description}</p>
                        
                        <div class="website-meta">
                            <span><i class="fas fa-calendar-alt"></i> ${new Date(website.created_at).toLocaleDateString()}</span>
                            <span><i class="fas fa-eye"></i> ${website.views || 0} views</span>
                        </div>
                        
                        <div class="website-tech">
                            ${Array.isArray(website.technologies) ? website.technologies.map(tech => 
                                `<span class="tech-tag">${tech}</span>`
                            ).join('') : ''}
                        </div>
                        
                        <div class="website-actions">
                            <a href="${website.url}" target="_blank" class="btn btn-sm btn-primary">
                                <i class="fas fa-external-link-alt"></i> ${translations.btnVisitSite || 'Visit Site'}
                            </a>
                            <button class="btn btn-sm btn-outline" onclick="app.viewWebsiteDetails(${website.id})">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', websiteHTML);
        });
    }

    renderBlogPosts() {
        const container = document.getElementById('blog-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        if (this.state.blogPosts.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1/-1; padding: var(--space-2xl);">
                    <div style="width: 80px; height: 80px; background: rgba(100, 255, 218, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-md);">
                        <i class="fas fa-newspaper fa-2x" style="color: var(--secondary);"></i>
                    </div>
                    <h3 style="color: var(--secondary);">${translations.emptyBlog || 'Mission Briefings Pending'}</h3>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">${translations.emptyBlogText || 'Stand by for mission briefings and tech discoveries!'}</p>
                    ${this.state.isAdmin ? `
                        <button class="btn btn-primary" onclick="app.showAdminSection('blog')" style="margin-top: var(--space-md);">
                            <i class="fas fa-edit"></i> ${translations.emptyBlog ? 'Create First Briefing' : 'Create First Briefing'}
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        this.state.blogPosts.forEach((post, index) => {
            const excerpt = post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : 'Briefing details classified.');
            
            const blogHTML = `
                <div class="blog-card animate__animated animate__fadeInUp" style="animation-delay: ${index * 100}ms">
                    <img src="${post.image || 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" 
                         alt="${post.title}" 
                         class="blog-image"
                         loading="lazy">
                    <div class="blog-content">
                        <span class="blog-category">${post.category || 'Mission Briefing'}</span>
                        <h3 class="blog-title">${post.title}</h3>
                        <p class="blog-excerpt">${excerpt}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                            <span><i class="fas fa-user-astronaut"></i> ${post.author || 'Mission Control'}</span>
                            <button class="btn btn-sm btn-outline" onclick="app.viewBlogPost(${post.id})">
                                ${translations.btnReadMore || 'Read Briefing'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', blogHTML);
        });
    }

    updateStats() {
        const projectsCount = document.getElementById('projects-count');
        const statsProjects = document.getElementById('stats-projects');
        const statsClients = document.getElementById('stats-clients');
        const statsArticles = document.getElementById('stats-articles');
        
        if (projectsCount) projectsCount.textContent = this.state.projects.length;
        if (statsProjects) statsProjects.textContent = this.state.projects.length;
        if (statsClients) statsClients.textContent = Math.floor(this.state.projects.length * 2.5);
        if (statsArticles) statsArticles.textContent = this.state.blogPosts.length;
    }

    initSkillsChart() {
        const ctx = document.getElementById('skillsChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.state.skillsChart) {
            this.state.skillsChart.destroy();
            this.state.skillsChart = null;
        }
        
        // Cleanup existing observer
        if (this.state.chartObserver) {
            this.state.chartObserver.disconnect();
            this.state.chartObserver = null;
        }
        
        // Aggregate skills from all developers
        const skillCounts = {};
        this.state.developers.forEach(dev => {
            const skills = Array.isArray(dev.skills) ? dev.skills : 
                          typeof dev.skills === 'string' ? dev.skills.split(',').map(s => s.trim()) : [];
            
            skills.forEach(skill => {
                if (skill.trim()) {
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                }
            });
        });
        
        const labels = Object.keys(skillCounts).slice(0, 8);
        const data = labels.map(label => {
            const count = skillCounts[label];
            // Scale: 1 developer = 30, 2 = 50, 3+ = 70-100
            return Math.min(30 + (count * 20), 100);
        });
        
        if (labels.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="text-center" style="padding: var(--space-2xl);">
                    <div style="width: 80px; height: 80px; background: rgba(100, 255, 218, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-md);">
                        <i class="fas fa-chart-network fa-2x" style="color: var(--secondary);"></i>
                    </div>
                    <h3 style="color: var(--secondary);">Tech Galaxy Map Unavailable</h3>
                    <p style="color: var(--text-secondary);">Assign crew members with skills to map the tech galaxy</p>
                    ${this.state.isAdmin ? `
                        <button class="btn btn-primary" onclick="app.showAdminSection('developers')" style="margin-top: var(--space-md);">
                            <i class="fas fa-user-astronaut"></i> Assign Crew Members
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(100, 255, 218, 0.15)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e6f1ff' : '#1e293b';
        const tickColor = isDark ? '#8892b0' : '#64748b';
        
        try {
            this.state.skillsChart = new Chart(ctx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Skill Proficiency',
                        data: data,
                        backgroundColor: 'rgba(100, 255, 218, 0.2)',
                        borderColor: 'rgba(100, 255, 218, 0.8)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(100, 255, 218, 1)',
                        pointBorderColor: isDark ? '#0a192f' : '#ffffff',
                        pointHoverBackgroundColor: isDark ? '#0a192f' : '#ffffff',
                        pointHoverBorderColor: 'rgba(100, 255, 218, 1)',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: window.innerWidth < 768 ? 1 : 2,
                    scales: {
                        r: {
                            angleLines: {
                                color: gridColor,
                                lineWidth: 1
                            },
                            grid: {
                                color: gridColor,
                                circular: true
                            },
                            pointLabels: {
                                font: {
                                    size: window.innerWidth < 768 ? 10 : 12,
                                    family: "'SF Mono', 'Fira Code', monospace"
                                },
                                color: textColor,
                                padding: 15
                            },
                            ticks: {
                                backdropColor: 'transparent',
                                color: tickColor,
                                stepSize: 20,
                                font: {
                                    size: 10
                                }
                            },
                            suggestedMin: 0,
                            suggestedMax: 100,
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: {
                                    family: "'SF Mono', 'Fira Code', monospace",
                                    size: 12
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(10, 25, 47, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: 'rgba(100, 255, 218, 0.5)',
                            borderWidth: 1
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
            
            // Use ResizeObserver for better performance
            this.state.chartObserver = new ResizeObserver(() => {
                if (this.state.skillsChart) {
                    this.state.skillsChart.resize();
                }
            });
            
            this.state.chartObserver.observe(ctx.parentElement);
            
        } catch (error) {
            console.error('Error creating skills chart:', error);
            ctx.parentElement.innerHTML = `
                <div class="text-center" style="padding: var(--space-xl);">
                    <p style="color: var(--danger);">Unable to load skills visualization</p>
                </div>
            `;
        }
    }

    initUI() {
        // Initialize navigation active state
        this.updateActiveNavOnScroll();
        
        // Initialize project filtering
        this.setupProjectFiltering();
        
        // Mark sections as visible with delay
        setTimeout(() => {
            document.querySelectorAll('.section').forEach(section => {
                section.classList.add('visible');
            });
        }, 100);
    }

    setupEventListeners() {
        try {
            // Theme toggle
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', this.toggleDarkMode);
            }
            
            // Mobile menu
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener('click', this.toggleMobileMenu);
            }
            
            // Navigation scroll
            document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
                link.addEventListener('click', (e) => this.handleNavClick(e, link));
            });
            
            // Language selector
            const languageSelector = document.getElementById('language-selector');
            if (languageSelector) {
                languageSelector.addEventListener('change', this.switchLanguage);
            }
            
            // Contact form
            const contactForm = document.getElementById('contact-form');
            if (contactForm) {
                contactForm.addEventListener('submit', this.handleContactSubmit);
            }
            
            // Admin login
            const adminLoginBtn = document.getElementById('admin-login-btn');
            if (adminLoginBtn) {
                adminLoginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLoginModal();
                });
            }
            
            const closeLogin = document.getElementById('close-login');
            if (closeLogin) {
                closeLogin.addEventListener('click', () => this.hideLoginModal());
            }
            
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', this.handleAdminLogin);
            }
            
            // Chat widget
            const chatToggle = document.getElementById('chat-toggle');
            if (chatToggle) {
                chatToggle.addEventListener('click', this.toggleChat);
            }
            
            const closeChat = document.getElementById('close-chat');
            if (closeChat) {
                closeChat.addEventListener('click', this.toggleChat);
            }
            
            const sendChat = document.getElementById('send-chat');
            if (sendChat) {
                sendChat.addEventListener('click', this.sendChatMessage);
            }
            
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendChatMessage();
                });
            }
            
            // Scroll effect for navbar
            window.addEventListener('scroll', this.handleScroll);
            
            // Close modals on outside click
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideLoginModal();
                }
                
                // Close mobile menu when clicking outside
                if (this.state.isMobileMenuOpen && 
                    !e.target.closest('.nav-links') && 
                    !e.target.closest('#mobile-menu-btn')) {
                    this.closeMobileMenu();
                }
            });
            
            // Escape key to close modal
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideLoginModal();
                    if (this.state.isMobileMenuOpen) {
                        this.closeMobileMenu();
                    }
                }
            });
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    initLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        if (images.length === 0) return;
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            img.classList.add('loaded');
                        }
                        imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
            
            images.forEach(img => {
                // Set placeholder if no src
                if (!img.src || img.src.includes('data:')) {
                    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                }
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    img.classList.add('loaded');
                }
            });
        }
    }

    setupScrollAnimations() {
        const sections = document.querySelectorAll('.section');
        if (sections.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        sections.forEach(section => observer.observe(section));
    }

    setupScrollProgress() {
        const progressBar = document.getElementById('scroll-progress');
        if (!progressBar) return;
        
        const scrollHandler = () => {
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = windowHeight > 0 ? (window.scrollY / windowHeight) * 100 : 0;
            progressBar.style.width = Math.min(scrolled, 100) + '%';
        };
        
        window.addEventListener('scroll', scrollHandler);
        // Initial call
        scrollHandler();
    }

    toggleDarkMode() {
        this.state.darkMode = !this.state.darkMode;
        document.body.classList.toggle('dark-theme', this.state.darkMode);
        localStorage.setItem('darkMode', this.state.darkMode);
        
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = this.state.darkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Update chart colors with delay to ensure DOM is ready
        setTimeout(() => {
            if (this.state.skillsChart) {
                this.initSkillsChart(); // Re-initialize for proper color update
            }
        }, 100);
    }

    toggleMobileMenu() {
        this.state.isMobileMenuOpen = !this.state.isMobileMenuOpen;
        const navLinks = document.querySelector('.nav-links');
        const menuBtn = document.getElementById('mobile-menu-btn');
        
        if (!navLinks || !menuBtn) return;
        
        navLinks.classList.toggle('active');
        
        // Update icon
        const icon = menuBtn.querySelector('i');
        if (icon) {
            icon.className = this.state.isMobileMenuOpen ? 'fas fa-times' : 'fas fa-bars';
        }
        
        // Update accessibility
        menuBtn.setAttribute('aria-expanded', this.state.isMobileMenuOpen);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.state.isMobileMenuOpen ? 'hidden' : '';
    }

    closeMobileMenu() {
        this.state.isMobileMenuOpen = false;
        const navLinks = document.querySelector('.nav-links');
        const menuBtn = document.getElementById('mobile-menu-btn');
        
        if (!navLinks || !menuBtn) return;
        
        navLinks.classList.remove('active');
        
        const icon = menuBtn.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bars';
        }
        
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    handleNavClick(e, link) {
        const href = link.getAttribute('href');
        if (!href.startsWith('#')) return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            // Close mobile menu
            this.closeMobileMenu();
            
            // Scroll to target
            const offset = 80; // Navbar height
            const targetPosition = target.offsetTop - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Update active nav
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
        }
    }

    setupProjectFiltering() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderProjects(btn.dataset.filter);
            });
        });
    }

    async handleContactSubmit(e) {
        e.preventDefault();
        
        // Reset errors
        this.clearFormErrors();
        
        const name = document.getElementById('contact-name')?.value.trim() || '';
        const email = document.getElementById('contact-email')?.value.trim() || '';
        const subject = document.getElementById('contact-subject')?.value.trim() || '';
        const message = document.getElementById('contact-message')?.value.trim() || '';
        
        // Validation
        let isValid = true;
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        if (!name) {
            this.showFormError('name-error', translations.errorNameRequired || 'Astronaut name is required');
            isValid = false;
        }
        
        if (!email) {
            this.showFormError('email-error', translations.errorEmailRequired || 'Email is required');
            isValid = false;
        } else if (!this.validateEmail(email)) {
            this.showFormError('email-error', translations.errorInvalidEmail || 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!subject) {
            this.showFormError('subject-error', translations.errorSubjectRequired || 'Subject is required');
            isValid = false;
        }
        
        if (!message) {
            this.showFormError('message-error', translations.errorMessageRequired || 'Message is required');
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Create message data
        const formData = {
            id: this.state.messageIdCounter++,
            name: name,
            email: email,
            subject: subject,
            message: message,
            created_at: new Date().toISOString(),
            read: false
        };
        
        // Show loading state
        const submitBtn = document.getElementById('contact-submit-btn');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            // Save message
            const saved = await this.saveToSupabase('messages', formData);
            
            if (saved) {
                this.state.messages.unshift(formData);
                this.showNotification('Transmission sent successfully! Mission control will respond soon.', 'success');
                e.target.reset();
            } else {
                this.showNotification('Failed to save transmission. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error saving message:', error);
            this.showNotification('Error sending transmission. Please try again.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    clearFormErrors() {
        document.querySelectorAll('.form-error').forEach(error => {
            error.classList.remove('visible');
            error.textContent = '';
        });
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('invalid');
        });
    }

    showFormError(id, message) {
        const errorElement = document.getElementById(id);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
            
            // Mark corresponding input as invalid
            const inputId = id.replace('-error', '');
            const input = document.getElementById(inputId);
            if (input) {
                input.classList.add('invalid');
            }
        }
    }

    validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email) && email.length <= 254;
    }

    handleScroll() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;
        
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        this.updateActiveNavOnScroll();
    }

    updateActiveNavOnScroll() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
        
        if (sections.length === 0 || navLinks.length === 0) return;
        
        let current = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    toggleChat() {
        this.state.chatOpen = !this.state.chatOpen;
        const chatWidget = document.getElementById('chat-widget');
        if (chatWidget) {
            chatWidget.classList.toggle('hidden', !this.state.chatOpen);
        }
        
        if (this.state.chatOpen) {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                setTimeout(() => chatInput.focus(), 100);
            }
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // Add user message
        const chatBody = document.getElementById('chat-body');
        if (!chatBody) return;
        
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-message user';
        userMsg.textContent = message;
        chatBody.appendChild(userMsg);
        
        // Clear input
        input.value = '';
        
        // Add loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'chat-message bot';
        loadingMsg.innerHTML = '<i class="fas fa-satellite fa-spin"></i> Processing transmission...';
        chatBody.appendChild(loadingMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        try {
            let response;
            
            // Try Gemini API if key is available
            if (CONFIG.geminiApiKey && CONFIG.geminiApiKey !== '') {
                try {
                    const systemPrompt = this.state.language === 'id' 
                        ? `You are SpaceTeam AI Assistant. Respond in Indonesian. ${CONFIG.aiSystemPrompt || 'You are a helpful AI assistant for SpaceTeam.'}`
                        : CONFIG.aiSystemPrompt || 'You are a helpful AI assistant for SpaceTeam.';
                    
                    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.geminiApiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `${systemPrompt}\n\nAstronaut: ${message}\n\nSpaceTeam AI:`
                                }]
                            }]
                        })
                    });

                    if (geminiResponse.ok) {
                        const data = await geminiResponse.json();
                        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                            response = data.candidates[0].content.parts[0].text;
                        }
                    }
                } catch (geminiError) {
                    console.warn('Gemini API failed, using fallback:', geminiError);
                }
            }
            
            // If no response from Gemini or no API key, use fallback
            if (!response) {
                const responses = {
                    en: [
                        "Transmission received! SpaceTeam specializes in cutting-edge web and mobile development. Ready to discuss your mission parameters.",
                        "Excellent inquiry! We offer mission briefings to plan your project. Would you like to schedule a transmission with mission control?",
                        "Based on your transmission, I recommend checking our mission log for similar operations we've completed.",
                        "We build digital solutions that push technological boundaries. How can we assist with your mission objectives?",
                        "For mission estimates, we typically require mission parameters. Would you like to share more details about your operation?"
                    ],
                    id: [
                        "Transmisi diterima! SpaceTeam mengkhususkan diri dalam pengembangan web dan mobile terkini. Siap mendiskusikan parameter misi Anda.",
                        "Pertanyaan yang bagus! Kami menawarkan pengarahan misi untuk merencanakan proyek Anda. Apakah Anda ingin menjadwalkan transmisi dengan kontrol misi?",
                        "Berdasarkan transmisi Anda, saya merekomendasikan untuk memeriksa log misi kami untuk operasi serupa yang telah kami selesaikan.",
                        "Kami membangun solusi digital yang mendorong batas teknologi. Bagaimana kami dapat membantu dengan tujuan misi Anda?",
                        "Untuk perkiraan misi, kami biasanya memerlukan parameter misi. Apakah Anda ingin berbagi lebih banyak detail tentang operasi Anda?"
                    ]
                };
                
                const langResponses = responses[this.state.language] || responses.en;
                response = langResponses[Math.floor(Math.random() * langResponses.length)];
            }
            
            // Remove loading indicator
            loadingMsg.remove();
            
            // Add bot response
            const botMsg = document.createElement('div');
            botMsg.className = 'chat-message bot';
            botMsg.textContent = response;
            chatBody.appendChild(botMsg);
        } catch (error) {
            console.error('Chat error:', error);
            loadingMsg.remove();
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'chat-message bot';
            errorMsg.textContent = "Transmission disrupted. Please contact mission control at " + (this.state.settings.contactEmail || CONFIG.defaults.contactEmail) + " for assistance.";
            chatBody.appendChild(errorMsg);
        }
        
        // Scroll to bottom
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    showLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                setTimeout(() => usernameInput.focus(), 100);
            }
        }
    }

    hideLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.add('hidden');
        }
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
        
        this.clearFormErrors();
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        
        this.clearFormErrors();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (!usernameInput || !passwordInput) return;
        
        const email = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Validation
        if (!email) {
            this.showFormError('login-email-error', 'Access code is required');
            return;
        }
        
        if (!password) {
            this.showFormError('login-password-error', 'Security key is required');
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('login-submit-btn');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            let authSuccess = false;
            
            // Try Supabase authentication first
            if (window.supabaseClient && CONFIG.supabaseUrl !== 'https://your-project.supabase.co') {
                try {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (!error && data.user) {
                        authSuccess = true;
                        this.state.isAdmin = true;
                        localStorage.setItem('spaceteam_admin_token', data.session.access_token);
                    }
                } catch (supabaseError) {
                    console.warn('Supabase auth failed:', supabaseError);
                }
            }
            
            // Fallback to local authentication
            if (!authSuccess && email === CONFIG.adminEmail && password === CONFIG.adminPassword) {
                authSuccess = true;
                this.state.isAdmin = true;
                localStorage.setItem('spaceteam_admin', 'true');
            }
            
            if (authSuccess) {
                this.hideLoginModal();
                this.showAdminPanel();
                this.showNotification('Mission control access granted!', 'success');
            } else {
                this.showNotification('Invalid access code or security key', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Access denied. Please try again.', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    checkAdminSession() {
        const isAdminLoggedIn = localStorage.getItem('spaceteam_admin') === 'true' || 
                               localStorage.getItem('spaceteam_admin_token');
        
        if (isAdminLoggedIn) {
            this.state.isAdmin = true;
            this.showAdminPanel();
        }
    }

    showAdminPanel() {
        const mainContent = document.getElementById('main-content');
        const footer = document.getElementById('footer');
        const runningText = document.querySelector('.running-text-container');
        const adminPanel = document.getElementById('admin-panel');
        const navbar = document.getElementById('navbar');
        
        if (mainContent) mainContent.classList.add('hidden');
        if (footer) footer.classList.add('hidden');
        if (runningText) runningText.classList.add('hidden');
        if (navbar) navbar.classList.add('hidden');
        if (adminPanel) adminPanel.classList.remove('hidden');
        
        this.loadAdminDashboard();
        this.setupAdminEventListeners();
    }

    hideAdminPanel() {
        const mainContent = document.getElementById('main-content');
        const footer = document.getElementById('footer');
        const runningText = document.querySelector('.running-text-container');
        const adminPanel = document.getElementById('admin-panel');
        const navbar = document.getElementById('navbar');
        
        if (mainContent) mainContent.classList.remove('hidden');
        if (footer) footer.classList.remove('hidden');
        if (runningText) runningText.classList.remove('hidden');
        if (navbar) navbar.classList.remove('hidden');
        if (adminPanel) adminPanel.classList.add('hidden');
        
        this.state.isAdmin = false;
        localStorage.removeItem('spaceteam_admin');
        localStorage.removeItem('spaceteam_admin_token');
        
        if (window.supabaseClient) {
            supabaseClient.auth.signOut().catch(console.error);
        }
        
        this.showNotification('Logged out from mission control', 'success');
    }

    setupAdminEventListeners() {
        // Admin navigation
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const section = btn.dataset.section;
                this.showAdminSection(section);
            });
        });
        
        // Admin logout
        const adminLogout = document.getElementById('admin-logout');
        if (adminLogout) {
            adminLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAdminPanel();
            });
        }
    }

    loadAdminDashboard() {
        const sectionsContainer = document.getElementById('admin-sections');
        if (!sectionsContainer) return;
        
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        const unreadMessages = this.state.messages.filter(msg => !msg.read).length;
        const recentMessages = this.state.messages.slice(0, 5);
        
        const dashboardHTML = `
            <div class="admin-section">
                <h2>${translations.adminDashboard || 'Mission Control Dashboard'}</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${this.state.developers.length}</div>
                        <div class="stat-label">${translations.adminActiveCrew || 'Active Crew'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.state.projects.length}</div>
                        <div class="stat-label">${translations.adminActiveMissions || 'Active Missions'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.state.blogPosts.length}</div>
                        <div class="stat-label">${translations.adminMissionBriefings || 'Mission Briefings'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.state.messages.length}</div>
                        <div class="stat-label">${translations.adminTransmissions || 'Transmissions'}</div>
                        ${unreadMessages > 0 ? `<span style="position: absolute; top: 10px; right: 10px; background: var(--danger); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">${unreadMessages}</span>` : ''}
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <div class="form-row">
                        <div>
                            <h3>Mission Controls</h3>
                            <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                                <button class="btn btn-primary" onclick="app.showAdminSection('developers')">
                                    <i class="fas fa-user-astronaut"></i> ${translations.adminManageCrew || 'Manage Crew'}
                                </button>
                                <button class="btn btn-secondary" onclick="app.showAdminSection('projects')">
                                    <i class="fas fa-rocket"></i> ${translations.adminManageMissions || 'Manage Missions'}
                                </button>
                                <button class="btn btn-outline" onclick="app.showAdminSection('websites')">
                                    <i class="fas fa-globe"></i> ${translations.adminManageWebsites || 'Manage Websites'}
                                </button>
                                <button class="btn btn-outline" onclick="app.showAdminSection('blog')">
                                    <i class="fas fa-edit"></i> ${translations.adminManageBriefings || 'Manage Briefings'}
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <h3>${translations.adminRecentTransmissions || 'Recent Transmissions'}</h3>
                            ${recentMessages.length > 0 ? `
                                <div style="margin-top: 15px; max-height: 200px; overflow-y: auto;">
                                    ${recentMessages.map(msg => `
                                        <div style="padding: 10px; background: rgba(100, 255, 218, 0.05); border-radius: var(--radius); margin-bottom: 10px; border: 1px solid rgba(100, 255, 218, 0.1); ${!msg.read ? 'border-left: 3px solid var(--secondary);' : ''}">
                                            <div style="display: flex; justify-content: space-between;">
                                                <strong style="color: var(--text-primary);">${msg.name}</strong>
                                                <small style="color: var(--text-tertiary);">${new Date(msg.created_at).toLocaleDateString()}</small>
                                            </div>
                                            <div style="font-size: 0.875rem; color: var(--text-secondary);">${msg.subject}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                ${unreadMessages > 0 ? `
                                    <button class="btn btn-sm btn-primary" onclick="app.showAdminSection('messages')" style="margin-top: 10px;">
                                        <i class="fas fa-satellite"></i> ${translations.adminTransmissions || 'View All Transmissions'} (${unreadMessages} unread)
                                    </button>
                                ` : ''}
                            ` : `
                                <p style="color: var(--text-tertiary); margin-top: 10px;">No transmissions yet</p>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        sectionsContainer.innerHTML = dashboardHTML;
        this.state.currentAdminSection = 'dashboard';
        
        // Update active nav
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === 'dashboard') {
                btn.classList.add('active');
            }
        });
    }

    showAdminSection(section) {
        this.state.currentAdminSection = section;
        this.state.editingId = null; // Reset editing state
        
        const sectionsContainer = document.getElementById('admin-sections');
        if (!sectionsContainer) return;
        
        let sectionHTML = '';
        
        switch(section) {
            case 'developers':
                sectionHTML = this.getDevelopersManagementHTML();
                break;
            case 'projects':
                sectionHTML = this.getProjectsManagementHTML();
                break;
            case 'websites':
                sectionHTML = this.getWebsiteManagementHTML();
                break;
            case 'blog':
                sectionHTML = this.getBlogManagementHTML();
                break;
            case 'messages':
                sectionHTML = this.getMessagesManagementHTML();
                break;
            case 'settings':
                sectionHTML = this.getSettingsManagementHTML();
                break;
            default:
                this.loadAdminDashboard();
                return;
        }
        
        sectionsContainer.innerHTML = sectionHTML;
        this.setupAdminSectionEventListeners(section);
        
        // Update active nav
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === section) {
                btn.classList.add('active');
            }
        });
    }

    setupAdminSectionEventListeners(section) {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.switchAdminTab(tabId);
            });
        });
        
        // Form submissions
        if (section === 'developers') {
            const form = document.getElementById('admin-developer-form');
            if (form) {
                form.addEventListener('submit', this.handleDeveloperFormSubmit);
            }
        } else if (section === 'projects') {
            const form = document.getElementById('admin-project-form');
            if (form) {
                form.addEventListener('submit', this.handleProjectFormSubmit);
            }
        } else if (section === 'websites') {
            const form = document.getElementById('admin-website-form');
            if (form) {
                form.addEventListener('submit', this.handleWebsiteFormSubmit);
            }
        } else if (section === 'blog') {
            const form = document.getElementById('admin-blog-form');
            if (form) {
                form.addEventListener('submit', this.handleBlogFormSubmit);
            }
        } else if (section === 'settings') {
            const form = document.getElementById('admin-settings-form');
            if (form) {
                form.addEventListener('submit', this.handleSettingsFormSubmit);
            }
        }
    }

    switchAdminTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Activate corresponding tab button
        const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        }
    }

    getDevelopersManagementHTML() {
        const developersListHTML = this.state.developers.map(dev => `
            <div class="admin-list-item">
                <div>
                    <h4 style="margin: 0; color: var(--text-primary);">${dev.name}</h4>
                    <p style="margin: 5px 0; color: var(--text-secondary);">${dev.role}</p>
                    <small style="color: var(--text-tertiary);">${Array.isArray(dev.skills) ? dev.skills.slice(0, 3).join(', ') : dev.skills || ''}</small>
                </div>
                <div class="admin-list-actions">
                    <button class="btn btn-sm" onclick="app.editDeveloper(${dev.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteDeveloper(${dev.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        const developerToEdit = this.state.editingId ? 
            this.state.developers.find(d => d.id === this.state.editingId) : null;
        
        return `
            <div class="admin-section">
                <div class="tab-nav">
                    <button class="tab-btn active" data-tab="developers-list">Mission Crew (${this.state.developers.length})</button>
                    <button class="tab-btn" data-tab="add-developer">${this.state.editingId ? 'Edit Crew Member' : 'Assign New Crew'}</button>
                </div>
                
                <div id="developers-list" class="tab-content active">
                    <h3>Manage Mission Crew</h3>
                    ${this.state.developers.length > 0 ? `
                        <div class="admin-list">
                            ${developersListHTML}
                        </div>
                    ` : `
                        <div class="text-center" style="padding: var(--space-2xl);">
                            <i class="fas fa-user-astronaut fa-3x" style="color: var(--text-tertiary); margin-bottom: var(--space-md);"></i>
                            <h3 style="color: var(--text-primary);">No Crew Assigned</h3>
                            <p style="color: var(--text-secondary);">Assign your first crew member to begin operations!</p>
                            <button class="btn btn-primary" onclick="app.switchAdminTab('add-developer')" style="margin-top: var(--space-md);">
                                <i class="fas fa-user-astronaut"></i> Assign First Crew
                            </button>
                        </div>
                    `}
                </div>
                
                <div id="add-developer" class="tab-content">
                    <h3>${this.state.editingId ? 'Edit Crew Member' : 'Assign New Crew Member'}</h3>
                    <form id="admin-developer-form">
                        <input type="hidden" id="admin-developer-id" value="${developerToEdit?.id || ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Astronaut Name *</label>
                                <input type="text" class="form-control" id="admin-dev-name" value="${developerToEdit?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mission Role *</label>
                                <input type="text" class="form-control" id="admin-dev-role" value="${developerToEdit?.role || ''}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Profile Image URL *</label>
                                <input type="text" class="form-control" id="admin-dev-image" value="${developerToEdit?.image || 'https://images.unsplash.com/photo-1534796636910-9c1825470300?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" required>
                                <small style="color: var(--text-tertiary);">Use Unsplash or similar service for space-themed images</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Transmission Address</label>
                                <input type="email" class="form-control" id="admin-dev-email" value="${developerToEdit?.email || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">GitHub Callsign</label>
                                <input type="text" class="form-control" id="admin-dev-github" value="${developerToEdit?.github || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Specializations (comma separated) *</label>
                                <input type="text" class="form-control" id="admin-dev-skills" value="${Array.isArray(developerToEdit?.skills) ? developerToEdit.skills.join(', ') : developerToEdit?.skills || ''}" required>
                                <small style="color: var(--text-tertiary);">Example: React, Node.js, Python, AWS, Space-Tech</small>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mission Bio *</label>
                            <textarea class="form-control" id="admin-dev-bio" rows="4" required>${developerToEdit?.bio || ''}</textarea>
                        </div>
                        <div style="display: flex; gap: 15px; margin-top: 20px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${this.state.editingId ? 'Update Crew Member' : 'Assign to Mission'}
                            </button>
                            <button type="button" class="btn btn-outline" onclick="app.resetDeveloperForm()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    getProjectsManagementHTML() {
        const projectsListHTML = this.state.projects.map(project => `
            <div class="admin-list-item">
                <div>
                    <h4 style="margin: 0; color: var(--text-primary);">${project.title}</h4>
                    <p style="margin: 5px 0; color: var(--text-secondary);">
                        ${project.type === 'web' ? 'Web Systems' : 
                          project.type === 'mobile' ? 'Mobile App' : 
                          'UI/UX Design'}
                    </p>
                    <small style="color: var(--text-tertiary);">${Array.isArray(project.tech) ? project.tech.slice(0, 3).join(', ') : project.tech || ''}</small>
                </div>
                <div class="admin-list-actions">
                    <button class="btn btn-sm" onclick="app.editProject(${project.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteProject(${project.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        const projectToEdit = this.state.editingId ? 
            this.state.projects.find(p => p.id === this.state.editingId) : null;
        
        return `
            <div class="admin-section">
                <div class="tab-nav">
                    <button class="tab-btn active" data-tab="projects-list">Mission Log (${this.state.projects.length})</button>
                    <button class="tab-btn" data-tab="add-project">${this.state.editingId ? 'Edit Mission' : 'Log New Mission'}</button>
                </div>
                
                <div id="projects-list" class="tab-content active">
                    <h3>Manage Mission Log</h3>
                    ${this.state.projects.length > 0 ? `
                        <div class="admin-list">
                            ${projectsListHTML}
                        </div>
                    ` : `
                        <div class="text-center" style="padding: var(--space-2xl);">
                            <i class="fas fa-rocket fa-3x" style="color: var(--text-tertiary); margin-bottom: var(--space-md);"></i>
                            <h3 style="color: var(--text-primary);">No Missions Logged</h3>
                            <p style="color: var(--text-secondary);">Log your first mission to showcase operations!</p>
                            <button class="btn btn-primary" onclick="app.switchAdminTab('add-project')" style="margin-top: var(--space-md);">
                                <i class="fas fa-rocket"></i> Log First Mission
                            </button>
                        </div>
                    `}
                </div>
                
                <div id="add-project" class="tab-content">
                    <h3>${this.state.editingId ? 'Edit Mission' : 'Log New Mission'}</h3>
                    <form id="admin-project-form">
                        <input type="hidden" id="admin-project-id" value="${projectToEdit?.id || ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Mission Name *</label>
                                <input type="text" class="form-control" id="admin-project-title" value="${projectToEdit?.title || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mission Type *</label>
                                <select class="form-control" id="admin-project-type" required>
                                    <option value="web" ${projectToEdit?.type === 'web' ? 'selected' : ''}>Web Systems</option>
                                    <option value="mobile" ${projectToEdit?.type === 'mobile' ? 'selected' : ''}>Mobile App</option>
                                    <option value="design" ${projectToEdit?.type === 'design' ? 'selected' : ''}>UI/UX Design</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Mission Image URL *</label>
                                <input type="text" class="form-control" id="admin-project-image" value="${projectToEdit?.image || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mission Link (Optional)</label>
                                <input type="url" class="form-control" id="admin-project-link" value="${projectToEdit?.link || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Technologies Used *</label>
                            <input type="text" class="form-control" id="admin-project-tech" value="${Array.isArray(projectToEdit?.tech) ? projectToEdit.tech.join(', ') : projectToEdit?.tech || ''}" required>
                            <small style="color: var(--text-tertiary);">Example: React, Node.js, MongoDB, AWS, Space-Tech</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mission Report *</label>
                            <textarea class="form-control" id="admin-project-description" rows="4" required>${projectToEdit?.description || ''}</textarea>
                        </div>
                        <div style="display: flex; gap: 15px; margin-top: 20px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${this.state.editingId ? 'Update Mission' : 'Log Mission'}
                            </button>
                            <button type="button" class="btn btn-outline" onclick="app.resetProjectForm()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    getWebsiteManagementHTML() {
        const websitesListHTML = this.state.websiteProjects.map(website => `
            <div class="admin-list-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${website.screenshot || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}" 
                         alt="${website.title}" 
                         style="width: 60px; height: 40px; object-fit: cover; border-radius: var(--radius);">
                    <div>
                        <h4 style="margin: 0; color: var(--text-primary);">${website.title}</h4>
                        <p style="margin: 5px 0; color: var(--text-secondary); font-size: 0.875rem;">${website.url}</p>
                        <small style="color: var(--text-tertiary);">${website.status || 'live'}</small>
                    </div>
                </div>
                <div class="admin-list-actions">
                    <button class="btn btn-sm" onclick="app.editWebsite(${website.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteWebsite(${website.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        const websiteToEdit = this.state.editingId ? 
            this.state.websiteProjects.find(w => w.id === this.state.editingId) : null;
        
        return `
            <div class="admin-section">
                <div class="tab-nav">
                    <button class="tab-btn active" data-tab="websites-list">Deployed Websites (${this.state.websiteProjects.length})</button>
                    <button class="tab-btn" data-tab="add-website">${this.state.editingId ? 'Edit Website' : 'Deploy New Website'}</button>
                </div>
                
                <div id="websites-list" class="tab-content active">
                    <h3>Manage Deployed Websites</h3>
                    ${this.state.websiteProjects.length > 0 ? `
                        <div class="admin-list">
                            ${websitesListHTML}
                        </div>
                    ` : `
                        <div class="text-center" style="padding: var(--space-2xl);">
                            <i class="fas fa-globe fa-3x" style="color: var(--text-tertiary); margin-bottom: var(--space-md);"></i>
                            <h3 style="color: var(--text-primary);">No Websites Deployed</h3>
                            <p style="color: var(--text-secondary);">Deploy your first website project!</p>
                            <button class="btn btn-primary" onclick="app.switchAdminTab('add-website')" style="margin-top: var(--space-md);">
                                <i class="fas fa-cloud-upload-alt"></i> Deploy First Website
                            </button>
                        </div>
                    `}
                </div>
                
                <div id="add-website" class="tab-content">
                    <h3>${this.state.editingId ? 'Edit Website' : 'Deploy New Website'}</h3>
                    <form id="admin-website-form">
                        <input type="hidden" id="admin-website-id" value="${websiteToEdit?.id || ''}">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Website Title *</label>
                                <input type="text" class="form-control" id="admin-website-title" value="${websiteToEdit?.title || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Website URL *</label>
                                <input type="url" class="form-control" id="admin-website-url" value="${websiteToEdit?.url || ''}" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Screenshot URL *</label>
                                <input type="text" class="form-control" id="admin-website-screenshot" value="${websiteToEdit?.screenshot || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-control" id="admin-website-status">
                                    <option value="live" ${websiteToEdit?.status === 'live' ? 'selected' : ''}>🚀 Live</option>
                                    <option value="maintenance" ${websiteToEdit?.status === 'maintenance' ? 'selected' : ''}>🚧 Maintenance</option>
                                    <option value="development" ${websiteToEdit?.status === 'development' ? 'selected' : ''}>👨‍💻 Development</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description *</label>
                            <textarea class="form-control" id="admin-website-description" rows="3" required>${websiteToEdit?.description || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Technologies Used *</label>
                            <input type="text" class="form-control" id="admin-website-technologies" value="${Array.isArray(websiteToEdit?.technologies) ? websiteToEdit.technologies.join(', ') : websiteToEdit?.technologies || ''}" required>
                            <small style="color: var(--text-tertiary);">Separate with commas: React, Node.js, MongoDB, etc.</small>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">GitHub Repository (Optional)</label>
                                <input type="url" class="form-control" id="admin-website-github" value="${websiteToEdit?.github || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Custom Icon (Optional)</label>
                                <input type="text" class="form-control" id="admin-website-icon" value="${websiteToEdit?.icon || 'fas fa-globe'}">
                                <small style="color: var(--text-tertiary);">FontAwesome icon class</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Additional Features</label>
                            <textarea class="form-control" id="admin-website-features" rows="2">${Array.isArray(websiteToEdit?.features) ? websiteToEdit.features.join(', ') : websiteToEdit?.features || ''}</textarea>
                            <small style="color: var(--text-tertiary);">Separate features with commas</small>
                        </div>
                        
                        <div style="display: flex; gap: 15px; margin-top: 30px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${this.state.editingId ? 'Update Website' : 'Deploy Website'}
                            </button>
                            <button type="button" class="btn btn-outline" onclick="app.resetWebsiteForm()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    getBlogManagementHTML() {
        const blogListHTML = this.state.blogPosts.map(post => `
            <div class="admin-list-item">
                <div>
                    <h4 style="margin: 0; color: var(--text-primary);">${post.title}</h4>
                    <p style="margin: 5px 0; color: var(--text-secondary);">
                        ${post.category || 'Mission Briefing'} • By ${post.author || 'Mission Control'}
                    </p>
                    <small style="color: var(--text-tertiary);">${new Date(post.created_at).toLocaleDateString()}</small>
                </div>
                <div class="admin-list-actions">
                    <button class="btn btn-sm" onclick="app.editBlogPost(${post.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteBlogPost(${post.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        const postToEdit = this.state.editingId ? 
            this.state.blogPosts.find(p => p.id === this.state.editingId) : null;
        
        return `
            <div class="admin-section">
                <div class="tab-nav">
                    <button class="tab-btn active" data-tab="blog-list">Mission Briefings (${this.state.blogPosts.length})</button>
                    <button class="tab-btn" data-tab="add-blog">${this.state.editingId ? 'Edit Briefing' : 'Create Briefing'}</button>
                </div>
                
                <div id="blog-list" class="tab-content active">
                    <h3>Manage Mission Briefings</h3>
                    ${this.state.blogPosts.length > 0 ? `
                        <div class="admin-list">
                            ${blogListHTML}
                        </div>
                    ` : `
                        <div class="text-center" style="padding: var(--space-2xl);">
                            <i class="fas fa-newspaper fa-3x" style="color: var(--text-tertiary); margin-bottom: var(--space-md);"></i>
                            <h3 style="color: var(--text-primary);">No Briefings Available</h3>
                            <p style="color: var(--text-secondary);">Create your first mission briefing!</p>
                            <button class="btn btn-primary" onclick="app.switchAdminTab('add-blog')" style="margin-top: var(--space-md);">
                                <i class="fas fa-edit"></i> Create First Briefing
                            </button>
                        </div>
                    `}
                </div>
                
                <div id="add-blog" class="tab-content">
                    <h3>${this.state.editingId ? 'Edit Mission Briefing' : 'Create Mission Briefing'}</h3>
                    <form id="admin-blog-form">
                        <input type="hidden" id="admin-blog-id" value="${postToEdit?.id || ''}">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Briefing Title *</label>
                                <input type="text" class="form-control" id="admin-blog-title" value="${postToEdit?.title || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Briefing Type *</label>
                                <input type="text" class="form-control" id="admin-blog-category" value="${postToEdit?.category || 'Mission Briefing'}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Author Callsign *</label>
                                <input type="text" class="form-control" id="admin-blog-author" value="${postToEdit?.author || 'Mission Control'}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Featured Image URL *</label>
                                <input type="text" class="form-control" id="admin-blog-image" value="${postToEdit?.image || 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Briefing Summary *</label>
                            <textarea class="form-control" id="admin-blog-excerpt" rows="3" required>${postToEdit?.excerpt || ''}</textarea>
                            <small style="color: var(--text-tertiary);">Brief summary of the briefing (150-200 characters)</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Full Briefing *</label>
                            <textarea class="form-control" id="admin-blog-content" rows="8" required>${postToEdit?.content || ''}</textarea>
                            <small style="color: var(--text-tertiary);">Complete mission briefing content</small>
                        </div>
                        <div style="display: flex; gap: 15px; margin-top: 20px;">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${this.state.editingId ? 'Update Briefing' : 'Publish Briefing'}
                            </button>
                            <button type="button" class="btn btn-outline" onclick="app.resetBlogForm()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    getMessagesManagementHTML() {
        const messagesListHTML = this.state.messages.map(msg => `
            <div class="admin-list-item" style="${!msg.read ? 'border-left: 3px solid var(--secondary);' : ''}">
                <div>
                    <h4 style="margin: 0; color: var(--text-primary);">${msg.name} <small style="color: var(--text-tertiary);">(${msg.email})</small></h4>
                    <p style="margin: 5px 0; color: var(--secondary); font-weight: 600;">${msg.subject}</p>
                    <p style="margin: 5px 0; color: var(--text-primary);">${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}</p>
                    <small style="color: var(--text-tertiary);">${new Date(msg.created_at).toLocaleString()}</small>
                </div>
                <div class="admin-list-actions">
                    <button class="btn btn-sm" onclick="app.viewMessage(${msg.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteMessage(${msg.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="admin-section">
                <h2>Transmissions (${this.state.messages.length})</h2>
                <p style="color: var(--text-tertiary);">Manage all mission transmissions and inquiries.</p>
                
                ${this.state.messages.length > 0 ? `
                    <div class="admin-list">
                        ${messagesListHTML}
                    </div>
                ` : `
                    <div class="text-center" style="padding: var(--space-2xl);">
                        <i class="fas fa-satellite fa-3x" style="color: var(--text-tertiary); margin-bottom: var(--space-md);"></i>
                        <h3 style="color: var(--text-primary);">No Transmissions Yet</h3>
                        <p style="color: var(--text-secondary);">All mission control transmissions will appear here.</p>
                    </div>
                `}
            </div>
        `;
    }

    getSettingsManagementHTML() {
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        return `
            <div class="admin-section">
                <h2>Mission Control Systems</h2>
                <p style="color: var(--text-tertiary);">Configure mission control systems and preferences.</p>
                
                <form id="admin-settings-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Mission Name (English) *</label>
                            <input type="text" class="form-control" id="admin-settings-title-en" value="${this.state.settings.siteTitle?.en || CONFIG.defaults.siteTitle.en}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mission Name (Indonesian) *</label>
                            <input type="text" class="form-control" id="admin-settings-title-id" value="${this.state.settings.siteTitle?.id || CONFIG.defaults.siteTitle.id}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Transmission Address *</label>
                            <input type="email" class="form-control" id="admin-settings-email" value="${this.state.settings.contactEmail || CONFIG.defaults.contactEmail}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Transmission Frequency *</label>
                            <input type="text" class="form-control" id="admin-settings-phone" value="${this.state.settings.contactPhone || CONFIG.defaults.contactPhone}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Mission Status Text (English) *</label>
                            <input type="text" class="form-control" id="admin-settings-running-text-en" value="${this.state.settings.runningText?.en || CONFIG.defaults.runningText.en}" required>
                            <small style="color: var(--text-tertiary);">Text that runs at the top of mission control</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Mission Status Text (Indonesian) *</label>
                            <input type="text" class="form-control" id="admin-settings-running-text-id" value="${this.state.settings.runningText?.id || CONFIG.defaults.runningText.id}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <div class="form-check" style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" class="form-control" id="admin-settings-chat-enabled" ${this.state.settings.chatEnabled !== false ? 'checked' : ''} style="width: auto;">
                                <label class="form-label" style="margin: 0; color: var(--text-primary);">Enable AI Assistant</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="form-check" style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" class="form-control" id="admin-settings-dark-mode" ${this.state.settings.darkMode ? 'checked' : ''} style="width: auto;">
                                <label class="form-label" style="margin: 0; color: var(--text-primary);">Enable Dark Mode by Default</label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Gemini API Key (Optional)</label>
                        <input type="password" class="form-control" id="admin-settings-gemini-key" value="${CONFIG.geminiApiKey || ''}">
                        <small style="color: var(--text-tertiary);">
                            Enter your Google Gemini API key to enable AI assistant. 
                            <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: var(--secondary);">Get API key</a>
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Cloud Systems Configuration</label>
                        <div style="background: rgba(100, 255, 218, 0.05); padding: var(--space-md); border-radius: var(--radius); border: 1px solid rgba(100, 255, 218, 0.1);">
                            <p style="margin-bottom: var(--space-sm); color: var(--text-primary);">
                                <strong>System Status:</strong> 
                                ${window.supabaseClient && CONFIG.supabaseUrl !== 'https://your-project.supabase.co' 
                                    ? '<span style="color: var(--success);">Cloud Systems Active</span>' 
                                    : '<span style="color: var(--warning);">Using Local Storage</span>'}
                            </p>
                            <p style="font-size: 0.875rem; color: var(--text-tertiary);">
                                To enable cloud systems, update the <code style="color: var(--secondary); background: rgba(100, 255, 218, 0.1); padding: 2px 5px; border-radius: 3px;">supabaseUrl</code> and <code style="color: var(--secondary); background: rgba(100, 255, 218, 0.1); padding: 2px 5px; border-radius: 3px;">supabaseKey</code> 
                                in the <code style="color: var(--secondary); background: rgba(100, 255, 218, 0.1); padding: 2px 5px; border-radius: 3px;">config.js</code> file with your cloud credentials.
                            </p>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px; margin-top: 30px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Systems
                        </button>
                        <button type="button" class="btn btn-outline" onclick="app.exportData()">
                            <i class="fas fa-download"></i> Backup Data
                        </button>
                        <button type="button" class="btn btn-danger" onclick="app.resetData()">
                            <i class="fas fa-trash"></i> System Reset
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    async handleDeveloperFormSubmit(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('admin-dev-name');
        const roleInput = document.getElementById('admin-dev-role');
        const imageInput = document.getElementById('admin-dev-image');
        const skillsInput = document.getElementById('admin-dev-skills');
        const bioInput = document.getElementById('admin-dev-bio');
        
        if (!nameInput || !roleInput || !imageInput || !skillsInput || !bioInput) {
            this.showNotification('Form fields missing', 'error');
            return;
        }
        
        // Get translations for error messages
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        // Validation
        if (!nameInput.value.trim()) {
            this.showNotification(translations.errorNameRequired || 'Astronaut name is required', 'error');
            return;
        }
        
        if (!roleInput.value.trim()) {
            this.showNotification(translations.errorRoleRequired || 'Mission role is required', 'error');
            return;
        }
        
        if (!bioInput.value.trim()) {
            this.showNotification(translations.errorBioRequired || 'Mission bio is required', 'error');
            return;
        }
        
        const skills = skillsInput.value.split(',').map(s => s.trim()).filter(s => s);
        if (skills.length === 0) {
            this.showNotification(translations.errorSkillsRequired || 'Please enter at least one skill', 'error');
            return;
        }
        
        const developerData = {
            id: this.state.editingId || this.state.developerIdCounter++,
            name: nameInput.value.trim(),
            role: roleInput.value.trim(),
            image: imageInput.value.trim(),
            email: document.getElementById('admin-dev-email')?.value.trim() || null,
            github: document.getElementById('admin-dev-github')?.value.trim() || null,
            skills: skills,
            bio: bioInput.value.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        
        try {
            const saved = await this.saveToSupabase('developers', developerData);
            
            if (saved) {
                this.showNotification(`Crew member ${this.state.editingId ? 'updated' : 'assigned'} successfully!`, 'success');
                this.state.editingId = null;
                await this.loadData();
                this.showAdminSection('developers');
            } else {
                this.showNotification('Error saving crew member', 'error');
            }
        } catch (error) {
            console.error('Error saving crew member:', error);
            this.showNotification('Error saving crew member: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    }

    async handleProjectFormSubmit(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('admin-project-title');
        const typeInput = document.getElementById('admin-project-type');
        const imageInput = document.getElementById('admin-project-image');
        const techInput = document.getElementById('admin-project-tech');
        const descriptionInput = document.getElementById('admin-project-description');
        
        if (!titleInput || !typeInput || !imageInput || !techInput || !descriptionInput) {
            this.showNotification('Form fields missing', 'error');
            return;
        }
        
        // Get translations for error messages
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        // Validation
        if (!titleInput.value.trim()) {
            this.showNotification(translations.errorTitleRequired || 'Mission name is required', 'error');
            return;
        }
        
        if (!descriptionInput.value.trim()) {
            this.showNotification(translations.errorDescriptionRequired || 'Mission report is required', 'error');
            return;
        }
        
        const tech = techInput.value.split(',').map(t => t.trim()).filter(t => t);
        if (tech.length === 0) {
            this.showNotification(translations.errorAtLeastOneTech || 'Please enter at least one technology', 'error');
            return;
        }
        
        const projectData = {
            id: this.state.editingId || this.state.projectIdCounter++,
            title: titleInput.value.trim(),
            type: typeInput.value,
            image: imageInput.value.trim(),
            link: document.getElementById('admin-project-link')?.value.trim() || null,
            tech: tech,
            description: descriptionInput.value.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        
        try {
            const saved = await this.saveToSupabase('projects', projectData);
            
            if (saved) {
                this.showNotification(`Mission ${this.state.editingId ? 'updated' : 'logged'} successfully!`, 'success');
                this.state.editingId = null;
                await this.loadData();
                this.showAdminSection('projects');
            } else {
                this.showNotification('Error saving mission', 'error');
            }
        } catch (error) {
            console.error('Error saving mission:', error);
            this.showNotification('Error saving mission: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    }

    async handleWebsiteFormSubmit(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('admin-website-title');
        const urlInput = document.getElementById('admin-website-url');
        const screenshotInput = document.getElementById('admin-website-screenshot');
        const descriptionInput = document.getElementById('admin-website-description');
        const technologiesInput = document.getElementById('admin-website-technologies');
        
        if (!titleInput || !urlInput || !screenshotInput || !descriptionInput || !technologiesInput) {
            this.showNotification('Required fields missing', 'error');
            return;
        }
        
        // Get translations for error messages
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        // Validasi URL
        try {
            new URL(urlInput.value.trim());
        } catch (error) {
            this.showNotification(translations.errorInvalidUrl || 'Please enter a valid URL', 'error');
            return;
        }
        
        // Validasi technologies
        const technologies = technologiesInput.value.split(',').map(t => t.trim()).filter(t => t);
        if (technologies.length === 0) {
            this.showNotification(translations.errorAtLeastOneTech || 'Please enter at least one technology', 'error');
            return;
        }
        
        // Validasi required fields
        if (!titleInput.value.trim()) {
            this.showNotification(translations.errorTitleRequired || 'Website title is required', 'error');
            return;
        }
        
        if (!descriptionInput.value.trim()) {
            this.showNotification(translations.errorDescriptionRequired || 'Description is required', 'error');
            return;
        }
        
        const websiteData = {
            id: this.state.editingId || this.state.websiteIdCounter++,
            title: titleInput.value.trim(),
            url: urlInput.value.trim(),
            screenshot: screenshotInput.value.trim(),
            status: document.getElementById('admin-website-status')?.value || 'live',
            description: descriptionInput.value.trim(),
            technologies: technologies,
            github: document.getElementById('admin-website-github')?.value.trim() || '',
            icon: document.getElementById('admin-website-icon')?.value.trim() || 'fas fa-globe',
            features: document.getElementById('admin-website-features')?.value.split(',').map(f => f.trim()).filter(f => f) || [],
            views: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        
        try {
            const saved = await this.saveToSupabase('website_projects', websiteData);
            
            if (saved) {
                this.showNotification(`Website ${this.state.editingId ? 'updated' : 'deployed'} successfully!`, 'success');
                this.state.editingId = null;
                await this.loadData();
                this.showAdminSection('websites');
            } else {
                this.showNotification('Error saving website', 'error');
            }
        } catch (error) {
            console.error('Error saving website:', error);
            this.showNotification('Error saving website: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    }

    async handleBlogFormSubmit(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('admin-blog-title');
        const categoryInput = document.getElementById('admin-blog-category');
        const authorInput = document.getElementById('admin-blog-author');
        const imageInput = document.getElementById('admin-blog-image');
        const excerptInput = document.getElementById('admin-blog-excerpt');
        const contentInput = document.getElementById('admin-blog-content');
        
        if (!titleInput || !categoryInput || !authorInput || !imageInput || !excerptInput || !contentInput) {
            this.showNotification('Form fields missing', 'error');
            return;
        }
        
        // Get translations for error messages
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        
        // Validation
        if (!titleInput.value.trim()) {
            this.showNotification(translations.errorTitleRequired || 'Briefing title is required', 'error');
            return;
        }
        
        if (!excerptInput.value.trim()) {
            this.showNotification(translations.errorDescriptionRequired || 'Briefing summary is required', 'error');
            return;
        }
        
        if (!contentInput.value.trim()) {
            this.showNotification(translations.errorMessageRequired || 'Full briefing is required', 'error');
            return;
        }
        
        if (excerptInput.value.length > 200) {
            this.showNotification(translations.errorExcerptTooLong || 'Briefing summary should be 200 characters or less', 'error');
            return;
        }
        
        const blogData = {
            id: this.state.editingId || this.state.blogIdCounter++,
            title: titleInput.value.trim(),
            category: categoryInput.value.trim(),
            author: authorInput.value.trim(),
            image: imageInput.value.trim(),
            excerpt: excerptInput.value.trim(),
            content: contentInput.value.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        
        try {
            const saved = await this.saveToSupabase('blog_posts', blogData);
            
            if (saved) {
                this.showNotification(`Mission briefing ${this.state.editingId ? 'updated' : 'published'} successfully!`, 'success');
                this.state.editingId = null;
                await this.loadData();
                this.showAdminSection('blog');
            } else {
                this.showNotification('Error saving briefing', 'error');
            }
        } catch (error) {
            console.error('Error saving briefing:', error);
            this.showNotification('Error saving briefing: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    }

    async handleSettingsFormSubmit(e) {
        e.preventDefault();
        
        const titleInputEn = document.getElementById('admin-settings-title-en');
        const titleInputId = document.getElementById('admin-settings-title-id');
        const emailInput = document.getElementById('admin-settings-email');
        const phoneInput = document.getElementById('admin-settings-phone');
        const runningTextEn = document.getElementById('admin-settings-running-text-en');
        const runningTextId = document.getElementById('admin-settings-running-text-id');
        const chatEnabledInput = document.getElementById('admin-settings-chat-enabled');
        const darkModeInput = document.getElementById('admin-settings-dark-mode');
        const geminiKeyInput = document.getElementById('admin-settings-gemini-key');
        
        if (!titleInputEn || !titleInputId || !emailInput || !phoneInput || !runningTextEn || !runningTextId || !chatEnabledInput || !darkModeInput) {
            this.showNotification('Form fields missing', 'error');
            return;
        }
        
        const settingsData = {
            siteTitle: {
                en: titleInputEn.value.trim(),
                id: titleInputId.value.trim()
            },
            contactEmail: emailInput.value.trim(),
            contactPhone: phoneInput.value.trim(),
            runningText: {
                en: runningTextEn.value.trim(),
                id: runningTextId.value.trim()
            },
            chatEnabled: chatEnabledInput.checked,
            darkMode: darkModeInput.checked
        };
        
        // Update Gemini API key in config
        if (geminiKeyInput && geminiKeyInput.value.trim()) {
            CONFIG.geminiApiKey = geminiKeyInput.value.trim();
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }
        
        try {
            const saved = await this.saveToSupabase('settings', settingsData);
            
            if (saved) {
                this.showNotification('Systems updated successfully!', 'success');
                await this.loadData();
                this.showAdminSection('settings');
            } else {
                this.showNotification('Error saving systems', 'error');
            }
        } catch (error) {
            console.error('Error saving systems:', error);
            this.showNotification('Error saving systems', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    }

    // Edit methods
    editDeveloper(id) {
        this.state.editingId = id;
        this.showAdminSection('developers');
        this.switchAdminTab('add-developer');
    }

    editProject(id) {
        this.state.editingId = id;
        this.showAdminSection('projects');
        this.switchAdminTab('add-project');
    }

    editWebsite(id) {
        this.state.editingId = id;
        this.showAdminSection('websites');
        this.switchAdminTab('add-website');
    }

    editBlogPost(id) {
        this.state.editingId = id;
        this.showAdminSection('blog');
        this.switchAdminTab('add-blog');
    }

    // Delete methods - FIXED
    async deleteDeveloper(id) {
        if (!confirm('Are you sure you want to remove this crew member from the mission?')) return;
        
        try {
            const deleted = await this.deleteFromSupabase('developers', id);
            
            if (deleted) {
                this.showNotification('Crew member removed successfully!', 'success');
                await this.loadData();
                this.showAdminSection('developers');
            } else {
                this.showNotification('Error removing crew member', 'error');
            }
        } catch (error) {
            console.error('Error removing crew member:', error);
            this.showNotification('Error removing crew member: ' + error.message, 'error');
        }
    }

    async deleteProject(id) {
        if (!confirm('Are you sure you want to delete this mission from the log?')) return;
        
        try {
            const deleted = await this.deleteFromSupabase('projects', id);
            
            if (deleted) {
                this.showNotification('Mission deleted from log!', 'success');
                await this.loadData();
                this.showAdminSection('projects');
            } else {
                this.showNotification('Error deleting mission', 'error');
            }
        } catch (error) {
            console.error('Error deleting mission:', error);
            this.showNotification('Error deleting mission: ' + error.message, 'error');
        }
    }

    async deleteWebsite(id) {
        if (!confirm('Are you sure you want to delete this website project?')) return;
        
        try {
            const deleted = await this.deleteFromSupabase('website_projects', id);
            
            if (deleted) {
                this.showNotification('Website deleted successfully!', 'success');
                await this.loadData();
                this.showAdminSection('websites');
            } else {
                this.showNotification('Error deleting website', 'error');
            }
        } catch (error) {
            console.error('Error deleting website:', error);
            this.showNotification('Error deleting website: ' + error.message, 'error');
        }
    }

    async deleteBlogPost(id) {
        if (!confirm('Are you sure you want to delete this mission briefing?')) return;
        
        try {
            const deleted = await this.deleteFromSupabase('blog_posts', id);
            
            if (deleted) {
                this.showNotification('Mission briefing deleted!', 'success');
                await this.loadData();
                this.showAdminSection('blog');
            } else {
                this.showNotification('Error deleting briefing', 'error');
            }
        } catch (error) {
            console.error('Error deleting briefing:', error);
            this.showNotification('Error deleting briefing: ' + error.message, 'error');
        }
    }

    async deleteMessage(id) {
        if (!confirm('Are you sure you want to delete this transmission?')) return;
        
        try {
            const deleted = await this.deleteFromSupabase('messages', id);
            
            if (deleted) {
                this.showNotification('Transmission deleted!', 'success');
                await this.loadData();
                this.showAdminSection('messages');
            } else {
                this.showNotification('Error deleting transmission', 'error');
            }
        } catch (error) {
            console.error('Error deleting transmission:', error);
            this.showNotification('Error deleting transmission: ' + error.message, 'error');
        }
    }

    // View methods
    viewMessage(id) {
        const message = this.state.messages.find(m => m.id === id);
        if (message) {
            // Mark as read
            message.read = true;
            this.saveToSupabase('messages', message).catch(console.error);
            
            alert(`Transmission Details:\n\nFrom: ${message.name} (${message.email})\nMission Type: ${message.subject}\nTransmission Time: ${new Date(message.created_at).toLocaleString()}\n\nTransmission:\n${message.message}`);
        }
    }

    viewProjectDetails(id) {
        const project = this.state.projects.find(p => p.id === id);
        if (project) {
            const typeMap = {
                'web': 'Web Systems',
                'mobile': 'Mobile App',
                'design': 'UI/UX Design'
            };
            
            alert(`Mission Details:\n\nMission Name: ${project.title}\nMission Type: ${typeMap[project.type] || project.type}\nMission Report: ${project.description}\nTechnologies: ${Array.isArray(project.tech) ? project.tech.join(', ') : project.tech || 'Not specified'}\n${project.link ? `Mission Link: ${project.link}` : ''}`);
        }
    }

    viewWebsiteDetails(id) {
        const website = this.state.websiteProjects.find(w => w.id === id);
        if (website) {
            alert(`Website Details:\n\nTitle: ${website.title}\nURL: ${website.url}\nStatus: ${website.status}\nDescription: ${website.description}\nTechnologies: ${Array.isArray(website.technologies) ? website.technologies.join(', ') : website.technologies || 'Not specified'}\n${website.github ? `GitHub: ${website.github}` : ''}`);
        }
    }

    viewBlogPost(id) {
        const post = this.state.blogPosts.find(p => p.id === id);
        if (post) {
            alert(`Mission Briefing:\n\nTitle: ${post.title}\nAuthor: ${post.author}\nBriefing Type: ${post.category}\nTransmission Date: ${new Date(post.created_at).toLocaleDateString()}\n\n${post.content || post.excerpt}`);
        }
    }

    // Reset methods
    resetDeveloperForm() {
        this.state.editingId = null;
        this.showAdminSection('developers');
    }

    resetProjectForm() {
        this.state.editingId = null;
        this.showAdminSection('projects');
    }

    resetWebsiteForm() {
        this.state.editingId = null;
        this.showAdminSection('websites');
    }

    resetBlogForm() {
        this.state.editingId = null;
        this.showAdminSection('blog');
    }

    // Export and reset data
    exportData() {
        const data = {
            developers: this.state.developers,
            projects: this.state.projects,
            websiteProjects: this.state.websiteProjects,
            blogPosts: this.state.blogPosts,
            messages: this.state.messages,
            settings: this.state.settings,
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `spaceteam-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        
        this.showNotification('Mission data backed up successfully!', 'success');
    }

    resetData() {
        if (!confirm('WARNING: This will delete ALL mission data including crew, missions, websites, briefings, and transmissions. This action cannot be undone. Are you sure?')) {
            return;
        }
        
        if (!confirm('Are you absolutely sure? All mission data will be permanently deleted.')) {
            return;
        }
        
        // Reset all data
        this.state.developers = [];
        this.state.projects = [];
        this.state.websiteProjects = [];
        this.state.blogPosts = [];
        this.state.messages = [];
        this.state.settings = { ...CONFIG.defaults };
        
        // Reset counters
        this.state.developerIdCounter = 1;
        this.state.projectIdCounter = 1;
        this.state.websiteIdCounter = 1;
        this.state.blogIdCounter = 1;
        this.state.messageIdCounter = 1;
        
        // Clear localStorage
        localStorage.removeItem('spaceteam_developers');
        localStorage.removeItem('spaceteam_projects');
        localStorage.removeItem('spaceteam_websites');
        localStorage.removeItem('spaceteam_blog');
        localStorage.removeItem('spaceteam_messages');
        localStorage.removeItem('spaceteam_settings');
        
        // Clear Supabase data
        if (window.supabaseClient && CONFIG.supabaseUrl !== 'https://your-project.supabase.co') {
            // We'll save empty arrays to clear data
            this.saveToSupabase('developers', []);
            this.saveToSupabase('projects', []);
            this.saveToSupabase('website_projects', []);
            this.saveToSupabase('blog_posts', []);
            this.saveToSupabase('messages', []);
        }
        
        this.showNotification('All mission data has been reset!', 'success');
        this.updateUI();
        
        if (this.state.isAdmin) {
            this.loadAdminDashboard();
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const translations = CONFIG.translations[this.state.language] || CONFIG.translations.en;
        const typeLabels = {
            success: translations.notificationSuccess || 'Success',
            error: translations.notificationError || 'Error',
            warning: translations.notificationWarning || 'Warning',
            info: translations.notificationInfo || 'Info'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode === container) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new SpaceTeamApp();
        window.app = app;
        
        // Expose methods for inline onclick handlers
        window.showAdminSection = (section) => app.showAdminSection(section);
        window.viewProjectDetails = (id) => app.viewProjectDetails(id);
        window.viewWebsiteDetails = (id) => app.viewWebsiteDetails(id);
        window.viewBlogPost = (id) => app.viewBlogPost(id);
        window.switchAdminTab = (tabId) => app.switchAdminTab(tabId);
        window.resetDeveloperForm = () => app.resetDeveloperForm();
        window.resetProjectForm = () => app.resetProjectForm();
        window.resetWebsiteForm = () => app.resetWebsiteForm();
        window.resetBlogForm = () => app.resetBlogForm();
        window.editDeveloper = (id) => app.editDeveloper(id);
        window.editProject = (id) => app.editProject(id);
        window.editWebsite = (id) => app.editWebsite(id);
        window.editBlogPost = (id) => app.editBlogPost(id);
        window.deleteDeveloper = (id) => app.deleteDeveloper(id);
        window.deleteProject = (id) => app.deleteProject(id);
        window.deleteWebsite = (id) => app.deleteWebsite(id);
        window.deleteBlogPost = (id) => app.deleteBlogPost(id);
        window.deleteMessage = (id) => app.deleteMessage(id);
        window.viewMessage = (id) => app.viewMessage(id);
        window.exportData = () => app.exportData();
        window.resetData = () => app.resetData();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #e53e3e; color: white; padding: 1rem; text-align: center; z-index: 9999;';
        errorDiv.textContent = 'Failed to load application. Please refresh the page.';
        document.body.appendChild(errorDiv);
    }
});
[file content end]