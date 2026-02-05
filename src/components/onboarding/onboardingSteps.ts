/**
 * Onboarding Steps
 * 
 * Step definitions for the onboarding tour.
 */

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string; // CSS selector for highlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: 'click' | 'hover' | 'none';
}

export const onboardingSteps: OnboardingStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Neural Nexus! 🧠',
        description: 'Your intelligent knowledge graph that transforms documents into interconnected insights. Let\'s take a quick tour.',
        position: 'center',
    },
    {
        id: 'upload',
        title: 'Upload Documents',
        description: 'Start by uploading PDFs, Word docs, or text files. Our AI will automatically extract entities and relationships.',
        targetSelector: '[data-tour="upload-button"]',
        position: 'bottom',
    },
    {
        id: 'library',
        title: 'Your Library',
        description: 'Access all your uploaded folders and files here. Organize knowledge by project or topic.',
        targetSelector: '[data-tour="library-nav"]',
        position: 'right',
    },
    {
        id: 'graph-view',
        title: '3D Knowledge Graph',
        description: 'Explore your knowledge as an interactive 3D neural network. Double-click nodes to expand, drag to rotate.',
        targetSelector: '[data-tour="graph-container"]',
        position: 'center',
    },
    {
        id: 'node-details',
        title: 'Node Details',
        description: 'Click any node to see its properties, relationships, and source documents.',
        targetSelector: '[data-tour="node-panel"]',
        position: 'left',
    },
    {
        id: 'algorithms',
        title: 'Graph Algorithms',
        description: 'Run powerful algorithms like PageRank, community detection, and link prediction to uncover hidden patterns.',
        targetSelector: '[data-tour="algorithm-drawer"]',
        position: 'left',
    },
    {
        id: 'chat',
        title: 'Ask Questions',
        description: 'Chat with your knowledge graph using natural language. Get answers with citations from your documents.',
        targetSelector: '[data-tour="chat-panel"]',
        position: 'top',
    },
    {
        id: 'command-palette',
        title: 'Quick Actions (Ctrl+K)',
        description: 'Press Ctrl+K anytime to open the command palette for quick navigation and actions.',
        position: 'center',
    },
    {
        id: 'complete',
        title: 'You\'re Ready! 🚀',
        description: 'Start by uploading your first document or explore with the sample data. Happy exploring!',
        position: 'center',
    },
];

export const ONBOARDING_COMPLETE_KEY = 'neural-nexus-onboarding-complete';
