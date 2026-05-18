// Global state for the SPA
let appState = {
    view: 'auth', // START ON AUTH VIEW
    authMode: 'login', // Default auth mode
    authError: null, // Error message display
    userRole: null, // 'parent' or 'doctor'
    parentName: 'Guest', // Parent's name
    babyProfile: {
        name: 'Baby Name',
        dob: 'YYYY-MM-DD',
        gender: 'N/A',
        allergies: 'None'
    },
    vaccinationRecords: [],
    appointmentRecords: [],
    appId: null,
    userId: null
};

const VACCINE_SCHEDULE = [
    { name: "BCG", age: "Birth", target: "Tuberculosis" },
    { name: "Hepatitis B (1)", age: "Birth", target: "Hepatitis B" },
    { name: "DTaP-IPV-Hib (1)", age: "2 Months", target: "Diphtheria, Tetanus, Pertussis, Polio, Hib" },
    { name: "Pneumococcal (1)", age: "2 Months", target: "Pneumococcal" },
    { name: "Rotavirus (1)", age: "2 Months", target: "Rotavirus" },
    { name: "DTaP-IPV-Hib (2)", age: "4 Months", target: "Diphtheria, Tetanus, Pertussis, Polio, Hib" },
    { name: "Pneumococcal (2)", age: "4 Months", target: "Pneumococcal" },
    { name: "Rotavirus (2)", age: "4 Months", target: "Rotavirus" },
    { name: "MMR (1)", age: "12 Months", target: "Measles, Mumps, Rubella" },
    { name: "Varicella (Chickenpox)", age: "12 Months", target: "Chickenpox" },
];

// Mock Content for the Content Library
const ARTICLES = [
    { title: "Understanding Sleep Regressions", tags: ["Sleep", "Behavior"], duration: "5 min read", content: "Sleep regressions are common phases where a baby or toddler who has been sleeping well suddenly starts waking up frequently. This usually coincides with major developmental leaps like learning to roll, crawl, or walk. The key is consistency and patience. Avoid introducing new habits during the regression." },
    { title: "First Foods: A Guide to Weaning", tags: ["Nutrition", "Milestones"], duration: "8 min read", content: "Starting solids is an exciting milestone. Begin with single-ingredient purees or soft finger foods (baby-led weaning). Introduce one new food every three to five days to monitor for allergic reactions. Always consult your pediatrician before beginning the process." },
    { title: "When to Call the Pediatrician", tags: ["Health", "Urgency"], duration: "3 min read", content: "While many issues are normal, call your doctor immediately for: high fever (over 100.4°F/38°C in newborns or sustained high fever in older babies), severe dehydration, blue lips/skin, inconsolable crying, or difficulty breathing. Trust your instincts—if you feel something is wrong, call." },
    { title: "Managing Separation Anxiety", tags: ["Behavior", "Toddler"], duration: "6 min read", content: "Separation anxiety peaks around 9-18 months. Practice short separations and always say a quick, firm goodbye, even if your child cries. Never sneak out. Consistency reassures the child that you will always return." },
];

const PARENT_DATA_DOC_PATH = (appId, userId) => `artifacts/${appId}/users/${userId}/baby_care_data/user_data`;
const USER_ROLE_DOC_PATH = (appId, userId) => `artifacts/${appId}/roles/${userId}`;

// --- Firebase Initialization (Moved from index.html) ---

async function initializeFirebase() {
    // Access global functions/config defined in the index.html head
    window.setLogLevel('Debug');
    
    const firebaseConfig = window.firebaseConfig;
    const appId = firebaseConfig.projectId; 
    
    if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase configuration is missing.");
        return;
    }

    try {
        const app = window.initializeApp(firebaseConfig);
        window.db = window.getFirestore(app);
        window.auth = window.getAuth(app);
        
        window.onAuthStateChanged(window.auth, (user) => {
            if (user) {
                window.userId = user.uid;
                window.isAuthReady = true;
                console.log("Firebase Auth Ready. User ID:", window.userId);
                window.startApp(appId, window.userId);
            } else {
                window.userId = null;
                window.isAuthReady = true;
                console.log("User signed out. Showing Auth screen.");
                window.startApp(appId, null);
            }
        });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = `<div class="p-8 text-center text-vax-red">Error connecting to database. Please check console for details.</div>`;
        }
    }
}


// --- View Rendering Functions ---

/** Renders the main navigation bar. */
function renderNavbar() {
    let navItems = '';
    let authButton = '';
    const isParent = appState.userRole === 'parent';
    const isDoctor = appState.userRole === 'doctor';

    if (appState.userId && isParent) {
        navItems = ['Dashboard', 'Vaccination', 'Appointments', 'Content'].map(item => `
            <button onclick="window.switchView('${item.toLowerCase()}')" 
                class="px-3 py-2 rounded-lg transition duration-200 
                ${appState.view === item.toLowerCase() ? 'bg-accent-green text-deep-blue font-semibold' : 'text-gray-300 hover:bg-blue-700'}">
                ${item}
            </button>
        `).join('');
    } else if (appState.userId && isDoctor) {
        navItems = `
            <button onclick="window.switchView('doctor-dashboard')" 
                class="px-3 py-2 rounded-lg transition duration-200 
                ${appState.view === 'doctor-dashboard' ? 'bg-accent-green text-deep-blue font-semibold' : 'text-gray-300 hover:bg-blue-700'}">
                Dashboard
            </button>
            <button onclick="window.switchView('appointments')" 
                class="px-3 py-2 rounded-lg transition duration-200 
                ${appState.view === 'appointments' ? 'bg-accent-green text-deep-blue font-semibold' : 'text-gray-300 hover:bg-blue-700'}">
                Appointments
            </button>
        `;
    }

    if (appState.userId) {
        authButton = `
            <button onclick="window.handleSignOut()" class="px-3 py-2 rounded-lg transition duration-200 text-gray-300 hover:bg-red-600">
                Sign Out
            </button>
        `;
    }

    return `
        <nav class="bg-deep-blue p-4 shadow-lg sticky top-0 z-10">
            <div class="container mx-auto flex w-full justify-between items-center">
                <h1 class="text-white text-2xl font-bold">BabyCare <span class="text-accent-green">Manager</span></h1>
                <div class="flex space-x-4">
                    ${navItems}
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-white text-sm font-semibold">
                        Welcome, ${appState.parentName || 'User'}
                    </span>
                    ${authButton}
                </div>
            </div>
        </nav>
    `;
}

/** Renders the main content based on the current appState.view. */
function renderMainContent() {
    let contentHtml = '';
    
    if (!appState.userId) {
        contentHtml = renderAuth();
    } else {
        switch (appState.view) {
            case 'dashboard':
                contentHtml = renderDashboard();
                break;
            case 'doctor-dashboard':
                contentHtml = renderDoctorDashboard();
                break;
            case 'vaccination':
                contentHtml = renderVaccinationTracker();
                break;
            case 'appointments':
                contentHtml = renderAppointments();
                break;
            case 'content':
                contentHtml = renderContentLibrary();
                break;
            default:
                contentHtml = appState.userRole === 'doctor' ? renderDoctorDashboard() : renderDashboard();
        }
    }

    return `
        <main class="container mx-auto p-4 md:p-8 flex-grow">
            ${contentHtml}
        </main>
    `;
}

function renderAuth() {
    const isLogin = appState.authMode === 'login';
    return `
        <div class="flex items-center justify-center min-h-full py-12">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
                <h2 class="text-3xl font-bold text-center text-deep-blue mb-6">
                    ${isLogin ? 'Welcome Back!' : 'Create Account'}
                </h2>
                
                ${appState.authError ? `<div class="p-3 mb-4 text-sm font-medium text-vax-red bg-red-100 rounded-lg">${appState.authError}</div>` : ''}

                <form id="auth-form" onsubmit="window.handleAuth(event)" class="space-y-4">
                    
                    ${appState.authMode === 'register' ? `
                        <div>
                            <label for="regName" class="block text-sm font-medium text-gray-700">Your Full Name</label>
                            <input type="text" id="regName" required placeholder="John Doe" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
                        </div>
                        <div>
                            <label for="regRole" class="block text-sm font-medium text-gray-700">Your Role</label>
                            <select id="regRole" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
                                <option value="parent">Parent</option>
                                <option value="doctor">Doctor</option>
                            </select>
                        </div>
                    ` : ''}

                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="email" required placeholder="name@example.com" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" required placeholder="••••••••" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
                    </div>
                    
                    <button type="submit" class="w-full bg-accent-green text-white font-bold py-3 px-4 rounded-lg hover:bg-soft-green transition shadow-md">
                        ${isLogin ? 'Sign In' : 'Register'}
                    </button>
                </form>

                <div class="mt-6 text-center text-sm">
                    <button onclick="window.toggleAuthMode()" class="text-deep-blue hover:underline">
                        ${isLogin ? 'Need an account? Register here.' : 'Already have an account? Sign in.'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderDashboard() {
    const profile = appState.babyProfile;
    return `
        <div class="space-y-8">
            <h2 class="text-4xl font-extrabold text-deep-blue mb-6 border-b pb-2">Welcome, ${appState.parentName}!</h2>
            
            <!-- Parent Profile Card (Edit Name) -->
            <div class="bg-white p-6 rounded-xl shadow-lg border border-soft-blue">
                <h3 class="text-2xl font-semibold text-deep-blue mb-4 flex items-center">
                    <svg class="w-6 h-6 mr-2 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    Parent Profile
                </h3>
                 <p class="text-lg mb-4"><strong>Name:</strong> ${appState.parentName}</p>
                 <button onclick="window.showParentProfileModal()" class="mt-2 bg-deep-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition">
                    Edit My Name
                </button>
            </div>

            <!-- Baby Profile Card -->
            <div class="bg-white p-6 rounded-xl shadow-lg border border-soft-blue">
                <h3 class="text-2xl font-semibold text-accent-green mb-4 flex items-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H9a1 1 0 01-1-1v-1a2 2 0 012-2h4a2 2 0 012 2v1a1 1 0 01-1 1zm0 0l2 2 4-4m-6 0h-4"></path></svg>
                    Baby Profile
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                    <p><strong>Name:</strong> ${profile.name}</p>
                    <p><strong>Date of Birth:</strong> ${profile.dob}</p>
                    <p><strong>Gender:</strong> ${profile.gender}</p>
                    <p><strong>Allergies:</strong> ${profile.allergies}</p>
                </div>
                <button onclick="window.showBabyProfileModal()" class="mt-4 bg-deep-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition">
                    Edit Baby Profile
                </button>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg text-center border-b-4 border-accent-green">
                    <p class="text-4xl font-bold text-deep-blue">${appState.vaccinationRecords.filter(v => v.status === 'Completed').length}</p>
                    <p class="text-gray-600 mt-2">Vaccinations Completed</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg text-center border-b-4 border-vax-red">
                    <p class="text-4xl font-bold text-deep-blue">${appState.vaccinationRecords.filter(v => v.status === 'Pending').length}</p>
                    <p class="text-gray-600 mt-2">Pending Doses</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg text-center border-b-4 border-deep-blue">
                    <p class="text-4xl font-bold text-deep-blue">${appState.appointmentRecords.length}</p>
                    <p class="text-gray-600 mt-2">Scheduled Consultations</p>
                </div>
            </div>
        </div>
    `;
}

function renderDoctorDashboard() {
     return `
        <h2 class="text-4xl font-extrabold text-deep-blue mb-6 border-b pb-2">Doctor Portal: Welcome, Dr. ${appState.parentName}!</h2>
        <p class="text-lg text-gray-600 mb-6">View and manage upcoming patient appointments and consultation history. This is the custom view for users with the 'doctor' role.</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Today's Appointments -->
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h3 class="text-2xl font-semibold text-vax-red mb-4">Appointments Log (${appState.appointmentRecords.length})</h3>
                <div class="space-y-3 max-h-96 overflow-y-auto">
                     ${appState.appointmentRecords.length === 0 
                        ? '<div class="p-3 bg-green-100 text-green-800 rounded-lg">No appointments scheduled.</div>' 
                        : appState.appointmentRecords.map(appt => `
                            <div class="border-b pb-2">
                                <p class="font-bold text-deep-blue">${appt.dateTime.substring(11, 16)} - Patient ID: ${appState.userId.substring(0, 8)}...</p>
                                <p class="text-sm text-gray-600">Reason: ${appt.reason}</p>
                                <p class="text-xs text-gray-400">Date: ${appt.dateTime.substring(0, 10)}</p>
                            </div>
                        `).join('')
                    }
                </div>
            </div>

            <!-- Statistics Placeholder -->
            <div class="bg-white p-6 rounded-xl shadow-lg text-center flex flex-col justify-center">
                <h3 class="text-2xl font-semibold text-deep-blue mb-4">Practice Overview</h3>
                <p class="text-5xl font-bold text-accent-green">42</p>
                <p class="text-gray-600 mt-2">Total Consultations This Month</p>
            </div>
        </div>
    `;
}

function renderVaccinationTracker() {
    return `
        <h2 class="text-4xl font-extrabold text-deep-blue mb-6 border-b pb-2">Vaccination Tracker</h2>
        <p class="text-lg text-gray-600 mb-6">Track your baby's mandatory vaccination schedule and completion status.</p>

        <div class="space-y-4">
            ${VACCINE_SCHEDULE.map(vax => {
                const record = appState.vaccinationRecords.find(r => r.name === vax.name);
                const status = record ? record.status : 'Pending';
                const bgColor = status === 'Completed' ? 'bg-accent-green' : (status === 'Pending' ? 'bg-vax-red' : 'bg-gray-400');
                const statusText = status === 'Completed' ? `Completed on: ${record.date}` : `Due around: ${vax.age}`;
                
                return `
                    <div class="flex flex-col md:flex-row items-start md:items-center bg-white p-4 rounded-xl shadow-md transition duration-200 hover:shadow-lg">
                        <div class="flex-grow">
                            <p class="text-xl font-semibold text-deep-blue">${vax.name} <span class="text-sm font-normal text-gray-500">(${vax.target})</span></p>
                            <p class="text-sm text-gray-500">${statusText}</p>
                        </div>
                        
                        <span class="mt-2 md:mt-0 text-white font-bold py-1 px-3 rounded-full text-sm ${bgColor}">
                            ${status}
                        </span>
                        
                        <button onclick="window.showVaccinationModal('${vax.name}', '${status}')" 
                            class="ml-0 mt-3 md:mt-0 md:ml-4 bg-deep-blue text-white text-sm px-3 py-1 rounded-lg hover:bg-blue-800 transition">
                            ${status === 'Completed' ? 'View/Update' : 'Mark as Done'}
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderAppointments() {
    const isDoctor = appState.userRole === 'doctor';
    const title = isDoctor ? 'Appointments Log' : 'Appointments & Consultations';

    return `
        <h2 class="text-4xl font-extrabold text-deep-blue mb-6 border-b pb-2">${title}</h2>
        <p class="text-lg text-gray-600 mb-6">${isDoctor ? 'Review all scheduled and historical appointments.' : 'Schedule, view, and manage your consultations with pediatric specialists.'}</p>

        ${!isDoctor ? `
            <button onclick="window.showAppointmentModal()" class="bg-accent-green text-white px-6 py-3 rounded-xl shadow-md hover:bg-soft-green transition mb-6">
                Book New Appointment
            </button>
        ` : ''}

        <!-- Appointment List -->
        <div class="space-y-4">
            ${appState.appointmentRecords.length === 0 
                ? '<div class="p-4 bg-yellow-100 text-yellow-800 rounded-lg">No appointments scheduled yet.</div>' 
                : appState.appointmentRecords.map((appt, index) => `
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-deep-blue flex justify-between items-center">
                    <div>
                        <p class="text-xl font-semibold text-deep-blue">${appt.doctor}</p>
                        <p class="text-gray-600">Date/Time: ${appt.dateTime}</p>
                        <p class="text-sm text-gray-500">Reason: ${appt.reason}</p>
                    </div>
                    ${!isDoctor ? `
                        <button onclick="window.removeAppointment(${index})" class="bg-vax-red text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm">Cancel</button>
                    ` : ''}
                </div>
            `).join('')
            }
        </div>
    `;
}

function renderContentLibrary() {
    return `
        <h2 class="text-4xl font-extrabold text-deep-blue mb-6 border-b pb-2">Content Library</h2>
        <p class="text-lg text-gray-600 mb-6">Expert-curated articles and videos on baby development and care topics. Click an article to read.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${ARTICLES.map(article => `
                <div onclick="window.readArticle('${article.title}')" 
                     class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100 cursor-pointer">
                    <h3 class="text-xl font-semibold text-deep-blue mb-2">${article.title}</h3>
                    <div class="space-x-2 mb-3">
                        ${article.tags.map(tag => `<span class="text-xs bg-soft-blue text-deep-blue px-2 py-0.5 rounded-full">${tag}</span>`).join('')}
                    </div>
                    <p class="text-gray-600 italic">${article.content.substring(0, 100)}...</p>
                    <p class="text-accent-green hover:underline mt-2 inline-block text-sm font-medium">Read Article (${article.duration}) &rarr;</p>
                </div>
            `).join('')}
        </div>
    `;
}

// --- Form Rendering Functions (used by Modals) ---

function getParentProfileFormContent() {
    return `
        <form id="parent-profile-form" onsubmit="window.saveParentProfile(event)" class="space-y-4">
            <div>
                <label for="parentNameInput" class="block text-sm font-medium text-gray-700">Your Full Name</label>
                <input type="text" id="parentNameInput" value="${appState.parentName !== 'Guest' ? appState.parentName : ''}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
            </div>
            <div class="flex justify-end pt-4">
                <button type="button" onclick="window.hideModal('parent-profile-modal')" class="mr-3 text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" class="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-soft-green transition">Save Name</button>
            </div>
        </form>
    `;
}

function getBabyProfileFormContent() {
    const p = appState.babyProfile;
    return `
        <form id="baby-profile-form" onsubmit="window.saveBabyProfile(event)" class="space-y-4">
            <div>
                <label for="babyName" class="block text-sm font-medium text-gray-700">Baby Name</label>
                <input type="text" id="babyName" value="${p.name !== 'Baby Name' ? p.name : ''}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
            </div>
            <div>
                <label for="dob" class="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input type="date" id="dob" value="${p.dob !== 'YYYY-MM-DD' ? p.dob : ''}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
            </div>
            <div>
                <label for="gender" class="block text-sm font-medium text-gray-700">Gender</label>
                <select id="gender" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
                    <option value="">Select Gender</option>
                    <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                    <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div>
                <label for="allergies" class="block text-sm font-medium text-gray-700">Known Allergies (e.g., Dairy, Peanuts)</label>
                <input type="text" id="allergies" value="${p.allergies !== 'None' ? p.allergies : ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border" placeholder="Enter N/A if none">
            </div>
            <div class="flex justify-end pt-4">
                <button type="button" onclick="window.hideModal('baby-profile-modal')" class="mr-3 text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" class="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-soft-green transition">Save Profile</button>
            </div>
        </form>
    `;
}

function getVaccinationFormContent() {
    return `
        <form id="vax-form" onsubmit="window.completeVaccination(event)" class="space-y-4">
            <input type="hidden" id="vaxName" required>
            <div id="vax-info" class="p-3 bg-soft-blue rounded-lg mb-4"></div>
            
            <div id="vax-status-section">
                <label for="vaxDate" class="block text-sm font-medium text-gray-700">Date of Completion</label>
                <input type="date" id="vaxDate" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
            </div>
            
            <div class="flex justify-end pt-4">
                <button type="button" onclick="window.hideModal('vax-modal')" class="mr-3 text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" id="vax-submit-btn" class="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-soft-green transition">Mark as Complete</button>
            </div>
        </form>
    `;
}

function getAppointmentFormContent() {
    return `
        <form id="appt-form" onsubmit="window.saveAppointment(event)" class="space-y-4">
            <div>
                <label for="doctor" class="block text-sm font-medium text-gray-700">Doctor/Specialist</label>
                <input type="text" id="doctor" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border" placeholder="e.g., Dr. Jane Smith, Pediatrician">
            </div>
            <div>
                <label for="apptDateTime" class="block text-sm font-medium text-gray-700">Date and Time</label>
                <input type="datetime-local" id="apptDateTime" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border">
            </div>
            <div>
                <label for="reason" class="block text-sm font-medium text-gray-700">Reason for Visit</label>
                <textarea id="reason" rows="3" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-deep-blue focus:ring-deep-blue p-2 border" placeholder="e.g., 6-month check-up, rash"></textarea>
            </div>
            <div class="flex justify-end pt-4">
                <button type="button" onclick="window.hideModal('appt-modal')" class="mr-3 text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" class="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-soft-green transition">Schedule Appointment</button>
            </div>
        </form>
    `;
}

function renderArticleModalContent(article) {
    return `
        <div class="p-6">
            <h3 class="text-3xl font-bold text-deep-blue mb-2">${article.title}</h3>
            <div class="space-x-2 mb-4">
                ${article.tags.map(tag => `<span class="text-sm bg-soft-blue text-deep-blue px-3 py-1 rounded-full font-medium">${tag}</span>`).join('')}
                <span class="text-sm text-gray-500">${article.duration}</span>
            </div>
            <p class="text-lg text-gray-700 leading-relaxed">${article.content}</p>
            
            <div class="flex justify-end pt-6 border-t mt-4">
                <button type="button" onclick="window.hideModal('content-modal')" class="bg-deep-blue text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition">
                    Close
                </button>
            </div>
        </div>
    `;
}

// --- Main Application Rendering ---

window.renderApp = function() {
    const container = document.getElementById('app-container');
    if (!container) return;

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }

    container.innerHTML = `
        ${renderNavbar()}
        ${renderMainContent()}
        ${renderFooter()}
    `;
    
    renderAllModals();
}

/** The main entry point for the application after Firebase Auth is ready. */
window.startApp = (appId, userId) => {
    appState.appId = appId;
    appState.userId = userId;

    if (userId) {
        setupDataListener(appId, userId);
        // Set view based on expected role, or dashboard if not yet loaded
        appState.view = appState.userRole === 'doctor' ? 'doctor-dashboard' : 'dashboard';
    } else {
        appState.userRole = null;
        appState.parentName = 'Guest';
        appState.view = 'auth';
        window.renderApp();
    }
};

// --- Data Persistence (Firebase Firestore) ---

async function updateParentData() {
    if (!window.db || !appState.userId || !window.doc || !window.setDoc) {
        console.warn("Database functions or User ID not ready. Skipping Parent Data update.");
        return;
    }
    try {
        const docRef = window.doc(window.db, PARENT_DATA_DOC_PATH(appState.appId, appState.userId));
        await window.setDoc(docRef, {
            babyProfile: appState.babyProfile,
            vaccinationRecords: appState.vaccinationRecords,
            appointmentRecords: appState.appointmentRecords
        }, { merge: true });
        console.log("Parent data updated successfully.");
    } catch (e) {
        console.error("Error writing document to Firestore:", e);
    }
}

async function updateUserRoleData(name, role) {
     if (!window.db || !appState.userId || !window.doc || !window.setDoc) {
        console.warn("Database functions or User ID not ready. Skipping Role update.");
        return;
    }
    try {
        const docRef = window.doc(window.db, USER_ROLE_DOC_PATH(appState.appId, appState.userId));
        await window.setDoc(docRef, {
            name: name,
            role: role,
            userId: appState.userId
        }, { merge: true });
        console.log("User Role and Name updated successfully.");
    } catch (e) {
        console.error("Error writing User Role document to Firestore:", e);
    }
}

function setupDataListener(appId, userId) {
    if (!window.db || !window.doc || !window.onSnapshot) return;

    // 1. Listen for User Role/Name (Must be fetched first)
    const roleRef = window.doc(window.db, USER_ROLE_DOC_PATH(appId, userId));
    window.onSnapshot(roleRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            appState.userRole = data.role || 'parent';
            appState.parentName = data.name || 'Parent';
        } else {
            // User just registered or profile doesn't exist yet, wait for registration save
            appState.userRole = appState.userRole || 'parent';
            appState.parentName = appState.parentName || 'Parent';
        }

        // 2. Based on role, listen for parent-specific data
        if (appState.userRole === 'parent') {
            listenForParentData(appId, userId);
        } else {
             window.renderApp(); // Doctors don't need baby profile data
        }
    }, (error) => {
        console.error("Error listening to Role changes:", error);
    });
}

function listenForParentData(appId, userId) {
    const dataRef = window.doc(window.db, PARENT_DATA_DOC_PATH(appId, userId));
    window.onSnapshot(dataRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            appState.babyProfile = data.babyProfile || appState.babyProfile;
            appState.vaccinationRecords = data.vaccinationRecords || [];
            appState.appointmentRecords = data.appointmentRecords || [];
            console.log("Data loaded/updated from Firestore:", data);
        } else {
            console.log("No baby data found, using initial state.");
        }
        window.renderApp();
    }, (error) => {
        console.error("Error listening to Parent Data changes:", error);
    });
}

// --- AUTHENTICATION LOGIC ---

window.toggleAuthMode = function() {
    appState.authMode = appState.authMode === 'login' ? 'register' : 'login';
    appState.authError = null;
    window.renderApp();
}

window.handleAuth = async function(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.elements['email'].value;
    const password = form.elements['password'].value;
    appState.authError = null;

    if (!window.auth) {
        appState.authError = "Authentication service not ready.";
        window.renderApp();
        return;
    }

    try {
        if (appState.authMode === 'register') {
            const name = form.elements['regName'].value;
            const role = form.elements['regRole'].value;

            const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
            appState.userId = userCredential.user.uid; // Ensure userId is set for updateUserRoleData
            await updateUserRoleData(name, role); 
        } else {
            await window.signInWithEmailAndPassword(window.auth, email, password);
        }
    } catch (error) {
        console.error("Auth error:", error.code, error.message);
        
        let friendlyMessage = "An unknown error occurred.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            friendlyMessage = "Invalid credentials. Please check your email and password.";
        } else if (error.code === 'auth/email-already-in-use') {
            friendlyMessage = "This email is already registered. Please sign in.";
        } else if (error.code === 'auth/weak-password') {
            friendlyMessage = "Password should be at least 6 characters.";
        } else if (error.code === 'auth/invalid-email') {
            friendlyMessage = "The email address is not valid.";
        }
        
        appState.authError = friendlyMessage;
        window.renderApp();
    }
}

window.handleSignOut = async function() {
    if (!window.auth) return;
    try {
        await window.signOut(window.auth);
        appState.userRole = null;
        appState.parentName = 'Guest';
        appState.babyProfile = { name: 'Baby Name', dob: 'YYYY-MM-DD', gender: 'N/A', allergies: 'None' };
    } catch (error) {
        console.error("Sign out error:", error);
    }
}

// --- Profile & Data Management Logic ---

window.saveParentProfile = async function(event) {
    event.preventDefault();
    const form = event.target;
    const newName = form.elements['parentNameInput'].value;
    
    await updateUserRoleData(newName, appState.userRole);
    
    appState.parentName = newName;
    window.hideModal('parent-profile-modal');
}

window.saveBabyProfile = async function(event) {
    event.preventDefault();
    const form = event.target;
    
    appState.babyProfile = {
        name: form.elements['babyName'].value,
        dob: form.elements['dob'].value,
        gender: form.elements['gender'].value,
        allergies: form.elements['allergies'].value || 'None'
    };

    await updateParentData();
    window.hideModal('baby-profile-modal');
}

window.completeVaccination = async function(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements['vaxName'].value;
    const date = form.elements['vaxDate'].value;
    
    // Remove existing record if it exists
    appState.vaccinationRecords = appState.vaccinationRecords.filter(r => r.name !== name);

    appState.vaccinationRecords.push({
        name: name,
        date: date,
        status: 'Completed'
    });

    await updateParentData();
    window.hideModal('vax-modal');
    window.switchView('vaccination');
}

window.saveAppointment = async function(event) {
    event.preventDefault();
    const form = event.target;
    
    const newAppointment = {
        doctor: form.elements['doctor'].value,
        dateTime: form.elements['apptDateTime'].value.replace('T', ' '),
        reason: form.elements['reason'].value,
        status: 'Scheduled'
    };

    appState.appointmentRecords.push(newAppointment);
    await updateParentData();
    window.hideModal('appt-modal');
    window.switchView('appointments');
}

window.removeAppointment = async function(index) {
    // Using a simple alert/confirm proxy as standard browser confirm() is blocked
    if (confirm("Are you sure you want to cancel this appointment?")) { 
        appState.appointmentRecords.splice(index, 1);
        await updateParentData();
        window.switchView('appointments');
    }
}

// --- Content Library Logic ---

window.readArticle = function(title) {
    const article = ARTICLES.find(a => a.title === title);
    if (!article) return;

    const modalContentContainer = document.querySelector('#content-modal .modal-content-area');
    if (modalContentContainer) {
        modalContentContainer.innerHTML = renderArticleModalContent(article);
    }
    window.showModal('content-modal');
}


function confirm(message) {
    return window.confirm(message); // Use standard browser confirm
}

// --- UI / Modal Management ---

window.switchView = function(viewName) {
    appState.view = viewName;
    window.renderApp();
}

function renderFooter() {
    return `
        <footer class="bg-gray-800 text-white py-4 mt-8">
            <div class="container mx-auto px-4 text-center text-sm text-gray-400">
                <p class="mb-2">User ID: <span class="font-mono text-xs">${appState.userId || 'Not Signed In'}</span></p>
                <p>&copy; 2025 BabyCareManager. All rights reserved.</p>
            </div>
        </footer>
    `;
}

function renderModal(id, title) {
    return `
        <div id="${id}" class="fixed inset-0 bg-gray-600 bg-opacity-75 modal-hidden items-center justify-center z-50 transition-opacity duration-300">
            <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full m-4">
                <div class="modal-content-area p-6">
                    <h3 class="text-xl font-bold text-deep-blue border-b pb-2 mb-4">${title}</h3>
                    <!-- Content injected here -->
                </div>
            </div>
        </div>
    `;
}

function renderAllModals() {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        document.body.appendChild(modalContainer);
    }
    
    // RENDER MODAL SHELLS
    modalContainer.innerHTML = `
        ${renderModal('parent-profile-modal', 'Edit My Profile')}
        ${renderModal('baby-profile-modal', 'Edit Baby Profile')}
        ${renderModal('vax-modal', 'Vaccination Status Update')}
        ${renderModal('appt-modal', 'Book New Consultation')}
        ${renderModal('content-modal', 'Article Viewer')}
    `;
    
    // PRE-POPULATE CONTENT MODALS (except content-modal)
    document.querySelector('#parent-profile-modal .modal-content-area').innerHTML = `<h3 class="text-xl font-bold text-deep-blue border-b pb-2 mb-4">Edit My Profile</h3>${getParentProfileFormContent()}`;
    document.querySelector('#baby-profile-modal .modal-content-area').innerHTML = `<h3 class="text-xl font-bold text-deep-blue border-b pb-2 mb-4">Edit Baby Profile</h3>${getBabyProfileFormContent()}`;
    document.querySelector('#vax-modal .modal-content-area').innerHTML = `<h3 class="text-xl font-bold text-deep-blue border-b pb-2 mb-4">Vaccination Status Update</h3>${getVaccinationFormContent()}`;
    document.querySelector('#appt-modal .modal-content-area').innerHTML = `<h3 class="text-xl font-bold text-deep-blue border-b pb-2 mb-4">Book New Consultation</h3>${getAppointmentFormContent()}`;
}

window.showModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('modal-hidden');
        modal.classList.add('flex');
    }
}

window.hideModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('modal-hidden');
        modal.classList.remove('flex');
    }
}

window.showParentProfileModal = function() {
    window.showModal('parent-profile-modal');
}

window.showBabyProfileModal = function() {
    window.showModal('baby-profile-modal');
}

window.showVaccinationModal = function(vaxName, currentStatus) {
    // Repopulate form content every time to ensure fresh state/handlers
    const vaxDetail = VACCINE_SCHEDULE.find(v => v.name === vaxName);
    const vaxRecord = appState.vaccinationRecords.find(r => r.name === vaxName);

    // Use querySelector to find elements inside the active modal content area
    const vaxNameInput = document.querySelector('#vax-modal #vaxName');
    const vaxInfoDiv = document.querySelector('#vax-modal #vax-info');
    const vaxDateInput = document.querySelector('#vax-modal #vaxDate');
    const submitBtn = document.querySelector('#vax-modal #vax-submit-btn');

    if (vaxNameInput) vaxNameInput.value = vaxName;
    if (vaxInfoDiv) vaxInfoDiv.innerHTML = `
        <p class="font-semibold">${vaxDetail.name}</p>
        <p class="text-sm">Target: ${vaxDetail.target}</p>
    `;

    if (currentStatus === 'Completed' && vaxRecord) {
        if (vaxDateInput) vaxDateInput.value = vaxRecord.date;
        if (submitBtn) submitBtn.textContent = 'Update Completion Date';
    } else {
        if (vaxDateInput) vaxDateInput.value = new Date().toISOString().substring(0, 10);
        if (submitBtn) submitBtn.textContent = 'Mark as Complete';
    }
    
    window.showModal('vax-modal');
}

window.showAppointmentModal = function() {
    window.showModal('appt-modal');
}

// --- Initial Setup ---
window.onload = function() {
    // Start the Firebase initialization process now that all JS functions are loaded
    initializeFirebase();
    renderAllModals(); 
}
