"use client";

import React, { useState, useEffect, useRef } from 'react';

const GlobalChatbot: React.FC = (): React.ReactElement => {
    // State variables for managing chatbot UI and data
    const [isOpen, setIsOpen] = useState(false); // Controls sidebar visibility
    const [activeTab, setActiveTab] = useState('main'); // Manages active tab (FAQ, Chat, Feedback)
    const [messages, setMessages] = useState<Array<{ text: string, isUser: boolean }>>([]); // Stores chat messages
    const [inputMessage, setInputMessage] = useState(''); // Stores current message input by user
    const [isLoading, setIsLoading] = useState(false); // Indicates if an API call is in progress
    const [chatId, setChatId] = useState<string>(''); // Stores the current chat session ID
    const [feedbackData, setFeedbackData] = useState({ // Stores feedback rating and text
        rating: 0,
        feedback: ''
    });
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({}); // Manages expanded state of FAQ categories
    const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({}); // Manages expanded state of individual FAQ questions
    const [showScrollTop, setShowScrollTop] = useState(false); // Controls visibility of the scroll-to-top button in FAQ
    const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]); // Stores bot's suggested follow-up questions

    // Refs for auto-scrolling and direct DOM access
    const messagesEndRef = useRef<HTMLDivElement>(null); // For scrolling to the last message view
    const chatMessagesContainerRef = useRef<HTMLDivElement>(null); // The actual scrollable div for chat messages
    const faqContainerRef = useRef<HTMLDivElement>(null); // The actual scrollable div for FAQ content
    const feedbackContentRef = useRef<HTMLDivElement>(null); // The actual scrollable div for feedback form content

    // --- Color Palette (Inspired by Saral Sewa Homepage) ---
    const PRIMARY_BLUE = '#2563eb'; // Deep blue, used for buttons, active states
    const LIGHT_BLUE_BACKGROUND = '#e0f2fe'; // Very light blue, for subtle backgrounds (like homepage hero)
    const LIGHTER_BLUE_HOVER = '#f0f9ff'; // Even lighter blue for super subtle hovers
    const DARK_TEXT = '#1f2937'; // Almost black, for main headings
    const MEDIUM_TEXT = '#4b5563'; // Darker grey for general text
    const LIGHT_TEXT = '#6b7280'; // Medium grey for secondary text / placeholders
    const BORDER_COLOR = '#e5e7eb'; // Light grey for borders
    const OFF_WHITE_BACKGROUND = '#f8fafc'; // For tab bar and input area backgrounds
    const GRADIENT_START = '#2563eb'; // Start of header gradient
    const GRADIENT_END = '#1d4ed8';    // End of header gradient (slightly darker blue)

    interface ChatResponse {
        response: string;
        chat_id: string;
    }

    // NEW & IMPROVED: Client-side rules for generating follow-up questions
    // Each rule has keywords (any of which can match) and follow-up questions.
    // Higher priority means this rule is checked first.
    const clientSideFollowUpRules = [
        // Agriculture Schemes
        {
            keywords: ["pradhan mantri fasal bima yojana", "pmfby", "crop insurance"],
            followUps: [
                "What crops are covered under PMFBY?",
                "How is crop loss assessed under PMFBY?",
                "What are the premium rates for PMFBY?",
                "Are there other agricultural insurance schemes?"
            ],
            priority: 100 // High priority for specific scheme
        },
        {
            keywords: ["pm-kisan", "direct income support", "farmer families"],
            followUps: [
                "What are the eligibility criteria for PM-KISAN?",
                "How to check PM-KISAN status?",
                "When are the PM-KISAN installments released?",
                "Are there other schemes for farmers?"
            ],
            priority: 100
        },
        {
            keywords: ["soil health card", "soil nutrient status"],
            followUps: [
                "How to get a Soil Health Card?",
                "What nutrients does the Soil Health Card test for?",
                "How does Soil Health Card benefit farmers?",
                "Where can I find more information on soil health?"
            ],
            priority: 90
        },
        {
            keywords: ["agricultural", "farmer", "crop"],
            followUps: [
                "What are the latest agricultural policies?",
                "How can farmers get financial assistance?",
                "Tell me about irrigation schemes.",
                "What technologies are available for farmers?"
            ],
            priority: 80 // General agriculture
        },

        // Education Schemes
        {
            keywords: ["national scholarship portal", "pm yashasvi scholarship", "scholarship"],
            followUps: [
                "How can I apply for a scholarship?",
                "What documents are needed for scholarships?",
                "Are there scholarships for higher education?",
                "What is the eligibility for PM YASHASVI?"
            ],
            priority: 100
        },
        {
            keywords: ["mid day meal scheme", "pm poshan", "school children nutrition"],
            followUps: [
                "What are the objectives of PM POSHAN?",
                "Which age group does the Mid Day Meal Scheme cover?",
                "What is the nutritional value provided by the scheme?",
                "How does the scheme impact school attendance?"
            ],
            priority: 90
        },
        {
            keywords: ["education", "student benefits"],
            followUps: [
                "Tell me about student loan schemes.",
                "Are there schemes for vocational training?",
                "What support is available for girls' education?",
                "How can I find educational institutions?"
            ],
            priority: 80 // General education
        },

        // Healthcare Schemes
        {
            keywords: ["ayushman bharat", "health insurance coverage", "golden card"],
            followUps: [
                "What are the benefits of Ayushman Bharat?",
                "How to get Ayushman Bharat Golden Card?",
                "Which hospitals are empaneled under Ayushman Bharat?",
                "What diseases are covered by Ayushman Bharat?"
            ],
            priority: 100
        },
        {
            keywords: ["janani suraksha yojana", "jsy", "pregnant women", "maternal mortality"],
            followUps: [
                "What are the eligibility criteria for JSY?",
                "What benefits does JSY provide to pregnant women?",
                "How can I apply for Janani Suraksha Yojana?",
                "Are there schemes for child healthcare?"
            ],
            priority: 90
        },
        {
            keywords: ["healthcare", "medical insurance", "wellness programs"],
            followUps: [
                "How can I get government medical assistance?",
                "Tell me about public health initiatives.",
                "Are there schemes for senior citizens' health?",
                "What are my rights regarding medical treatment?"
            ],
            priority: 80 // General healthcare
        },

        // Employment Schemes
        {
            keywords: ["mgnrega", "wage employment", "rural areas", "livelihood security"],
            followUps: [
                "What types of work are provided under MGNREGA?",
                "How to apply for MGNREGA job card?",
                "What is the wage rate under MGNREGA?",
                "How does MGNREGA impact rural development?"
            ],
            priority: 100
        },
        {
            keywords: ["pradhan mantri kaushal vikas yojana", "pmkvy", "skill training", "youth employment"],
            followUps: [
                "What is the eligibility for PMKVY?",
                "What skill trainings are offered under PMKVY?",
                "How to find a PMKVY training center?",
                "Are there job placement services with PMKVY?"
            ],
            priority: 90
        },
        {
            keywords: ["startup india", "entrepreneurs", "funding", "tax benefits"],
            followUps: [
                "What are the tax benefits for startups in India?",
                "How to register a startup under Startup India?",
                "What is the Seed Fund Scheme for startups?",
                "Are there mentorship programs for startups?"
            ],
            priority: 90
        },
        {
            keywords: ["employment", "job opportunities", "skill development"],
            followUps: [
                "How can I find government job vacancies?",
                "Tell me about unemployment benefits.",
                "What are the latest skill development programs?",
                "Are there schemes for self-employment?"
            ],
            priority: 80 // General employment
        },

        // Housing Schemes
        {
            keywords: ["pradhan mantri awas yojana", "pmay", "affordable housing", "housing subsidy"],
            followUps: [
                "What are the eligibility criteria for PMAY?",
                "How to check PMAY beneficiary status?",
                "What are the different components of PMAY?",
                "Is PMAY applicable for urban and rural areas?"
            ],
            priority: 100
        },
        {
            keywords: ["housing schemes", "property assistance", "shelter programs"],
            followUps: [
                "Tell me about housing loans and subsidies.",
                "Are there schemes for specific income groups for housing?",
                "What support is available for tribal housing?",
                "How can I apply for government housing?"
            ],
            priority: 80 // General housing
        },

        // Social Welfare Schemes
        {
            keywords: ["national social assistance programme", "nsap", "financial assistance elderly", "widows disabled"],
            followUps: [
                "What are the components of NSAP?",
                "Who is eligible for NSAP benefits?",
                "How to apply for pension under NSAP?",
                "Are there social security schemes for all citizens?"
            ],
            priority: 100
        },
        {
            keywords: ["disability pension", "social welfare department"],
            followUps: [
                "What documents are needed for disability pension?",
                "What are the benefits of disability pension?",
                "Are there other social welfare schemes for disabled persons?",
                "How can I get a disability certificate?"
            ],
            priority: 90
        },
        {
            keywords: ["beti bachao beti padhao", "bbbp", "girl child education", "gender-biased sex selection"],
            followUps: [
                "What are the main objectives of Beti Bachao Beti Padhao?",
                "How does BBBP promote girl child education?",
                "What initiatives are part of BBBP?",
                "Are there other schemes for women's empowerment?"
            ],
            priority: 90
        },
        {
            keywords: ["social welfare", "pensions", "social security"],
            followUps: [
                "What schemes are available for senior citizens?",
                "How can I apply for a widow pension?",
                "Tell me about schemes for vulnerable sections of society.",
                "What is the process for grievance redressal in social welfare?"
            ],
            priority: 80 // General social welfare
        },

        // Generic / Error / No Specific Match
        {
            keywords: ["sorry, there was an error", "no response received", "please try again", "check your connection"],
            followUps: [
                "What kind of information can you provide?",
                "Can you help me with government schemes in general?",
                "How does this chatbot work?",
                "Can I provide feedback on this response?"
            ],
            priority: 10 // Low priority for error/general questions
        },
        {
            // This acts as the ultimate fallback if no other rules match
            keywords: ["general"], // A dummy keyword to ensure this is always the last resort if nothing else matches
            followUps: [
                "Can you tell me more about government schemes?",
                "What other services do you offer?",
                "How can I get started?",
                "Is there a contact person for further help?"
            ],
            priority: 1 // Lowest priority
        }
    ];

    // NEW & IMPROVED: Function to generate client-side follow-up questions
    const generateClientSideFollowUps = (botResponse: string): string[] => {
        const lowerCaseResponse = botResponse.toLowerCase();
        let questionsToSuggest: string[] = [];

        // Sort rules by priority in descending order
        const sortedRules = [...clientSideFollowUpRules].sort((a, b) => b.priority - a.priority);

        for (const rule of sortedRules) {
            // Check if any of the rule's keywords are present in the bot's response
            const isMatch = rule.keywords.some(keyword => lowerCaseResponse.includes(keyword.toLowerCase()));

            if (isMatch) {
                questionsToSuggest = rule.followUps;
                break; // Found a matching rule, use its follow-ups and stop
            }
        }

        // Fallback to "general" questions if no specific rule matched
        if (questionsToSuggest.length === 0) {
             const generalRule = clientSideFollowUpRules.find(rule => rule.keywords.includes("general"));
             if (generalRule) {
                questionsToSuggest = generalRule.followUps;
             }
        }

        // Remove duplicates and limit the number of suggestions
        return Array.from(new Set(questionsToSuggest)).slice(0, 4); // Limit to 4 relevant suggestions
    };


    // Auto-scroll to bottom when new messages are added or loading state changes in Chat tab
    useEffect(() => {
        if (activeTab === 'chat' && chatMessagesContainerRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, activeTab, followUpSuggestions]); // Added followUpSuggestions to dependency array

    // Effect hook to handle FAQ scroll and show/hide scroll-to-top button
    useEffect(() => {
        if (activeTab === 'main' && faqContainerRef.current) {
            const faqContainer = faqContainerRef.current;
            const handleScroll = () => {
                setShowScrollTop(faqContainer.scrollTop > 200);
            };
            faqContainer.addEventListener('scroll', handleScroll);
            return () => faqContainer.removeEventListener('scroll', handleScroll);
        } else {
            setShowScrollTop(false); // Hide button if not on FAQ tab
        }
    }, [activeTab]);

    // Function to scroll the FAQ container to the top
    const scrollToTop = () => {
        if (faqContainerRef.current) {
            faqContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Utility function to format bot messages (e.g., for bolding)
    const formatMessage = (text: string): string => {
        const boldRegex = /\*\*(.*?)\*\*/g;
        const formattedText = text.replace(boldRegex, '<strong>$1</strong>');
        return formattedText;
    };

    // Function to send a message to the backend API
    const sendMessage = async (messageToSend = inputMessage) => {
        if (!messageToSend.trim()) return;

        const userMessage = messageToSend.trim();
        setInputMessage(''); // Clear input field
        setIsLoading(true);
        setFollowUpSuggestions([]); // Clear previous suggestions when user sends a new message

        setMessages(prev => [...prev, { text: userMessage, isUser: true }]);

        try {
            const API_BASE_URL=process.env.NEXT_PUBLIC_API_BASE_URL ;
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: userMessage,
                    scheme_slug: "",
                    chat_id: chatId
                }),
            });

            let botResponseText = 'Sorry, there was an unexpected error. Please try again.'; // Default error message

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                botResponseText = errorData.detail || 'Sorry, there was an error processing your request. Please try again.';
            } else {
                const data: ChatResponse = await response.json();
                if (data.chat_id && !chatId) {
                    setChatId(data.chat_id);
                }
                botResponseText = data.response || 'No response received.';
            }

            setMessages(prev => [...prev, { text: botResponseText, isUser: false }]);

            // NEW: Generate client-side follow-up questions based on the bot's response text
            const newFollowUps = generateClientSideFollowUps(botResponseText);
            setFollowUpSuggestions(newFollowUps);

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = 'Sorry, there was a network error. Please check your connection and try again.';
            setMessages(prev => [...prev, { text: errorMessage, isUser: false }]);
            setFollowUpSuggestions(generateClientSideFollowUps(errorMessage)); // Generate follow-ups for network errors
        } finally {
            setIsLoading(false);
        }
    };

    // Function to clear all messages and reset the chat ID
    const clearChat = () => {
        setMessages([]);
        setChatId(''); // Reset chat ID for a new conversation
        setInputMessage(''); // Clear input field
        setFollowUpSuggestions([]); // Clear follow-up suggestions on chat clear
    };

    // Handler for key presses in the input field, specifically for 'Enter' to send messages
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Function to submit user feedback
    const submitFeedback = async () => {
        if (feedbackData.rating === 0) {
            alert('Please provide a rating');
            return;
        }

        try {
            console.log('Feedback submitted:', feedbackData);
            setIsLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsLoading(false);

            setFeedbackData({ rating: 0, feedback: '' });
            alert('Thank you for your feedback!');

        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Error submitting feedback. Please try again.');
        }
    };

    // Function to toggle the expanded state of an FAQ category
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    // Function to toggle the expanded state of an individual FAQ question
    const toggleQuestion = (questionId: string) => {
        setExpandedQuestions(prev => ({
            ...prev,
            [questionId]: !prev[questionId]
        }));
    };

    // Data structure for FAQ categories and their questions, with enhanced properties
    const faqCategories = [
        {
            id: 'education',
            title: 'Education',
            icon: '📚',
            color: '#3b82f6', // Primary color for the category (blue)
            bgColor: '#eff6ff', // Background color for category header (light blue)
            description: 'Scholarships, educational schemes & student benefits',
            questions: [
                {
                    id: 'edu1',
                    question: 'What are the scholarships available for students?',
                    answer: 'Various scholarships are available including **National Scholarship Portal** schemes, merit-based scholarships, and need-based financial assistance for different educational levels.',
                },
                {
                    id: 'edu2',
                    question: 'How can I apply for PM YASHASVI scholarship?',
                    answer: 'You can apply through the **National Scholarship Portal**. Eligible students from OBC, EBC and DNT categories can apply for this scholarship scheme.',
                },
                {
                    id: 'edu3',
                    question: 'What is the Mid Day Meal Scheme?',
                    answer: 'PM POSHAN (formerly Mid Day Meal Scheme) provides free lunch to school children to improve nutritional status and encourage school attendance.',
                }
            ]
        },
        {
            id: 'healthcare',
            title: 'Healthcare',
            icon: '🏥',
            color: '#10b981', // Green
            bgColor: '#ecfdf5', // Light green
            description: 'Medical insurance, health schemes & wellness programs',
            questions: [
                {
                    id: 'health1',
                    question: 'What is Ayushman Bharat scheme?',
                    answer: '**Ayushman Bharat** provides health insurance coverage up to ₹5 lakh per family per year for secondary and tertiary care hospitalization.',
                },
                {
                    id: 'health2',
                    question: 'How to get Ayushman Bharat Golden Card?',
                    answer: 'Visit your nearest Common Service Center (CSC) or empaneled hospital with Aadhaar card and other required documents to get your **Ayushman Bharat card**.',
                },
                {
                    id: 'health3',
                    question: 'What is Janani Suraksha Yojana?',
                    answer: '**JSY** is a cash assistance scheme for pregnant women to promote institutional deliveries and reduce maternal and neonatal mortality.',
                }
            ]
        },
        {
            id: 'employment',
            title: 'Employment',
            icon: '💼',
            color: '#f59e0b', // Orange
            bgColor: '#fffbeb', // Light orange
            description: 'Job opportunities, skill development & employment schemes',
            questions: [
                {
                    id: 'emp1',
                    question: 'What is MGNREGA scheme?',
                    answer: '**MGNREGA** provides guaranteed 100 days of wage employment in rural areas to enhance livelihood security and create durable assets.',
                },
                {
                    id: 'emp2',
                    question: 'How to register for Pradhan Mantri Kaushal Vikas Yojana?',
                    answer: 'You can register online through **PMKVY portal** or visit your nearest training center. The scheme provides skill training to youth for better employment opportunities.',
                },
                {
                    id: 'emp3',
                    question: 'What is Startup India initiative?',
                    answer: '**Startup India** provides support to entrepreneurs through funding, mentorship, tax benefits, and ease of doing business measures.',
                }
            ]
        },
        {
            id: 'agriculture',
            title: 'Agriculture',
            icon: '🌾',
            color: '#84cc16', // Lime green
            bgColor: '#f7fee7', // Light lime green
            description: 'Farmer support, crop insurance & agricultural benefits',
            questions: [
                {
                    id: 'agri1',
                    question: 'What is PM-KISAN scheme?',
                    answer: '**PM-KISAN** provides direct income support of ₹6,000 per year to small and marginal farmer families in three equal installments.',
                },
                {
                    id: 'agri2',
                    question: 'How to apply for Pradhan Mantri Fasal Bima Yojana?',
                    answer: 'Farmers can apply through banks, insurance companies, or online portal. The scheme provides insurance coverage for crop losses due to natural calamities.',
                },
                {
                    id: 'agri3',
                    question: 'What is Soil Health Card scheme?',
                    answer: '**Soil Health Cards** provide information about soil nutrient status and recommendations for appropriate dosage of nutrients to improve soil health and fertility.',
                }
            ]
        },
        {
            id: 'housing',
            title: 'Housing',
            icon: '🏠',
            color: '#8b5cf6', // Purple
            bgColor: '#faf5ff', // Light purple
            description: 'Housing schemes, property assistance & shelter programs',
            questions: [
                {
                    id: 'house1',
                    question: 'What is Pradhan Mantri Awas Yojana?',
                    answer: '**PMAY** aims to provide affordable housing to all by 2022. It offers credit-linked subsidies and direct assistance for house construction/enhancement.',
                },
                {
                    id: 'house2',
                    question: 'How to check PMAY beneficiary status?',
                    answer: 'You can check your application status online through **PMAY official website** using your application number or Aadhaar number.',
                },
                {
                    id: 'house3',
                    question: 'What documents are required for PMAY application?',
                    answer: 'Required documents include Aadhaar card, income certificate, property documents, bank account details, and photographs of the applicant and family.',
                }
            ]
        },
        {
            id: 'social',
            title: 'Social Welfare',
            icon: '👥',
            color: '#ef4444', // Red
            bgColor: '#fef2f2', // Light red
            description: 'Pensions, disability support & social security schemes',
            questions: [
                {
                    id: 'social1',
                    question: 'What is National Social Assistance Programme?',
                    answer: '**NSAP** provides financial assistance to elderly, widows, and disabled persons belonging to Below Poverty Line households.',
                },
                {
                    id: 'social2',
                    question: 'How to apply for disability pension?',
                    answer: 'Apply through your state\'s social welfare department with disability certificate, BPL card, Aadhaar card, and other required documents.',
                },
                {
                    id: 'social3',
                    question: 'What is Beti Bachao Beti Padhao scheme?',
                    answer: '**BBBP** focuses on preventing gender-biased sex selection and promoting girl child education and empowerment through various initiatives.',
                }
            ]
        }
    ];

    // Tab navigation data
    const tabs = [
        { id: 'main', label: 'FAQ', icon: '❓' },
        { id: 'chat', label: 'Chat', icon: '💭' },
        { id: 'feedback', label: 'Feedback', icon: '⭐' }
    ];

    // Helper function to render star rating icons
    const renderStars = (rating: number) => {
        return [...Array(5)].map((_, index) => (
            <span
                key={index}
                onClick={() => setFeedbackData(prev => ({ ...prev, rating: index + 1 }))}
                style={{
                    cursor: 'pointer',
                    fontSize: '32px',
                    color: index < rating ? '#f59e0b' : '#d1d5db',
                    transition: 'color 0.2s ease',
                    userSelect: 'none'
                }}
            >
                ⭐
            </span>
        ));
    };

    // Suggested questions for the chat tab (initial suggestions when chat is empty)
    const suggestedQuestions = [
        'How can I find out which government schemes I am eligible for?',
        'Tell me about housing schemes for low-income families',
        'How can I check my PM-KISAN status?',
        'Tell me about scholarships for higher education.',
        'What support is available for farmers under agricultural schemes?',
        'What is Ayushman Bharat Yojana?',
    ];

    return (
        <>
            {/* Floating Chat Button - Only show when sidebar is closed */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: PRIMARY_BLUE,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        transition: 'transform 0.2s ease'
                    }}
                >
                    💬
                </button>
            )}

            {/* Chat Overlay / Modal */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        zIndex: 1001,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
                    }}
                >
                    {/* Inner Chatbot Modal Container - This is the fixed height container */}
                    <div
                        style={{
                            width: 'min(95vw, 900px)',
                            height: 'min(95vh, 700px)',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                    >
                        {/* Header (always present at the top of the modal) */}
                        <div
                            style={{
                                padding: '15px 20px',
                                borderBottom: `1px solid ${BORDER_COLOR}`,
                                background: `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`,
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}
                        >
                            <div>
                                <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600' }}>
                                    Government Scheme Assistant
                                </h2>
                                <p style={{ margin: '0', fontSize: '14px', opacity: '0.9' }}>
                                    Ask me about government schemes and policies
                                </p>
                            </div>
                            {/* Main close button for the entire chatbot modal */}
                            <button
                                onClick={() => setIsOpen(false)}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                }}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    flexShrink: 0
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div
                            style={{
                                display: 'flex',
                                borderBottom: `1px solid ${BORDER_COLOR}`,
                                backgroundColor: OFF_WHITE_BACKGROUND,
                                flexShrink: 0
                            }}
                        >
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== tab.id) {
                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = LIGHTER_BLUE_HOVER;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== tab.id) {
                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 8px',
                                        border: 'none',
                                        backgroundColor: activeTab === tab.id ? LIGHT_BLUE_BACKGROUND : 'transparent',
                                        color: activeTab === tab.id ? PRIMARY_BLUE : LIGHT_TEXT,
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content Area - This will dynamically render based on activeTab */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>

                            {/* FAQ Section */}
                            {activeTab === 'main' && (
                                <>
                                    {/* FAQ content specific header */}
                                    <div
                                        style={{
                                            padding: '15px 20px',
                                            borderBottom: `1px solid ${BORDER_COLOR}`,
                                            backgroundColor: OFF_WHITE_BACKGROUND,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: '500', color: DARK_TEXT }}>
                                            Frequently Asked Questions
                                        </span>
                                        {/* Close button here for consistency (though main close button also works) */}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = BORDER_COLOR;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                            }}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: 'transparent',
                                                border: `1px solid ${BORDER_COLOR}`,
                                                color: LIGHT_TEXT,
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* FAQ content main scrollable area */}
                                    <div
                                        ref={faqContainerRef}
                                        data-faq-container
                                        style={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            scrollBehavior: 'smooth',
                                            minHeight: 0,
                                        }}
                                    >
                                        {/* Hero Section */}
                                        <div style={{
                                            background: `linear-gradient(135deg, ${LIGHTER_BLUE_HOVER} 0%, ${LIGHT_BLUE_BACKGROUND} 100%)`,
                                            padding: '24px 20px',
                                            textAlign: 'center',
                                            borderBottom: `1px solid ${BORDER_COLOR}`,
                                        }}>
                                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏛️</div>
                                            <h3 style={{
                                                margin: '0 0 8px 0',
                                                fontSize: '20px',
                                                fontWeight: '700',
                                                color: PRIMARY_BLUE,
                                                background: `linear-gradient(135deg, ${PRIMARY_BLUE} 0%, #3b82f6 100%)`,
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent'
                                            }}>
                                                Saral Sewa
                                            </h3>
                                            <p style={{
                                                margin: '0',
                                                fontSize: '14px',
                                                color: MEDIUM_TEXT,
                                                lineHeight: '1.5'
                                            }}>
                                                Discover benefits, schemes and services designed for your needs
                                            </p>
                                        </div>

                                        {/* Statistics Bar */}
                                        <div style={{
                                            padding: '16px 20px',
                                            backgroundColor: OFF_WHITE_BACKGROUND,
                                            display: 'flex',
                                            justifyContent: 'space-around',
                                            borderBottom: `1px solid ${BORDER_COLOR}`,
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>6</div>
                                                <div style={{ fontSize: '11px', color: LIGHT_TEXT, fontWeight: '500' }}>Categories</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>18</div>
                                                <div style={{ fontSize: '11px', color: LIGHT_TEXT, fontWeight: '500' }}>FAQ Items</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>24/7</div>
                                                <div style={{ fontSize: '11px', color: LIGHT_TEXT, fontWeight: '500' }}>Support</div>
                                            </div>
                                        </div>

                                        {/* FAQ Categories - This is the actual content that overflows within data-faq-container */}
                                        <div style={{ padding: '20px 0' }}>
                                            {faqCategories.map((category) => (
                                                <div
                                                    key={category.id}
                                                    style={{
                                                        margin: '0 16px 16px 16px',
                                                        borderRadius: '12px',
                                                        overflow: 'hidden',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                        border: `1px solid ${BORDER_COLOR}`,
                                                        backgroundColor: 'white'
                                                    }}
                                                >
                                                    {/* Enhanced Category Header */}
                                                    <button
                                                        onClick={() => toggleCategory(category.id)}
                                                        onMouseEnter={(e) => {
                                                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                                                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)';
                                                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '20px',
                                                            border: 'none',
                                                            background: `linear-gradient(135deg, ${category.bgColor} 0%, white 100%)`,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            color: DARK_TEXT,
                                                            textAlign: 'left',
                                                            transition: 'all 0.3s ease',
                                                            borderBottom: expandedCategories[category.id] ? `1px solid ${BORDER_COLOR}` : 'none'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                                            <div style={{
                                                                fontSize: '28px',
                                                                padding: '8px',
                                                                borderRadius: '12px',
                                                                backgroundColor: 'white',
                                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                                            }}>
                                                                {category.icon}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '17px', fontWeight: '700', color: category.color, marginBottom: '2px' }}>
                                                                    {category.title}
                                                                </div>
                                                                <div style={{ fontSize: '13px', color: MEDIUM_TEXT, fontWeight: '400' }}>
                                                                    {category.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                fontSize: '11px',
                                                                backgroundColor: category.color,
                                                                color: 'white',
                                                                padding: '4px 8px',
                                                                borderRadius: '12px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {category.questions.length} Q&A
                                                            </div>
                                                            <span
                                                                style={{
                                                                    fontSize: '20px',
                                                                    color: category.color,
                                                                    transform: expandedCategories[category.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    transition: 'transform 0.3s ease'
                                                                }}
                                                            >
                                                                ⌄
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {/* Enhanced Category Questions */}
                                                    {expandedCategories[category.id] && (
                                                        <div style={{ backgroundColor: '#fafafa' }}>
                                                            {category.questions.map((qa, index) => (
                                                                <div key={qa.id} style={{
                                                                    borderBottom: index < category.questions.length - 1 ? `1px solid ${BORDER_COLOR}` : 'none'
                                                                }}>
                                                                    {/* Enhanced Question */}
                                                                    <button
                                                                        onClick={() => toggleQuestion(qa.id)}
                                                                        onMouseEnter={(e) => {
                                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = LIGHTER_BLUE_HOVER;
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '16px 20px',
                                                                            border: 'none',
                                                                            backgroundColor: 'transparent',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'flex-start',
                                                                            justifyContent: 'space-between',
                                                                            fontSize: '15px',
                                                                            fontWeight: '600',
                                                                            color: MEDIUM_TEXT,
                                                                            textAlign: 'left',
                                                                            lineHeight: '1.5',
                                                                            transition: 'background-color 0.2s ease'
                                                                        }}
                                                                    >
                                                                        <div style={{ flex: 1, paddingRight: '16px' }}>
                                                                            <div style={{ marginBottom: '8px' }}>
                                                                                {qa.question}
                                                                            </div>
                                                                        </div>
                                                                        <span
                                                                            style={{
                                                                                fontSize: '16px',
                                                                                color: category.color,
                                                                                transform: expandedQuestions[qa.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                                transition: 'transform 0.2s ease',
                                                                                flexShrink: 0,
                                                                                marginTop: '2px'
                                                                            }}
                                                                        >
                                                                            ⌄
                                                                        </span>
                                                                    </button>

                                                                    {/* Enhanced Answer */}
                                                                    {expandedQuestions[qa.id] && (
                                                                        <div
                                                                            style={{
                                                                                padding: '16px 20px 20px 20px',
                                                                                backgroundColor: '#ffffff',
                                                                                borderTop: `1px solid ${BORDER_COLOR}`
                                                                            }}
                                                                        >
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                alignItems: 'flex-start',
                                                                                gap: '12px',
                                                                                marginBottom: '12px'
                                                                            }}>
                                                                                <p style={{
                                                                                    margin: '0',
                                                                                    fontSize: '14px',
                                                                                    color: MEDIUM_TEXT,
                                                                                    lineHeight: '1.6',
                                                                                    flex: 1
                                                                                }}>
                                                                                    {/* Format FAQ answers for bolding */}
                                                                                    <span dangerouslySetInnerHTML={{ __html: formatMessage(qa.answer) }} />
                                                                                </p>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setInputMessage(qa.question); // Set the question as input
                                                                                        setActiveTab('chat'); // Switch to chat tab
                                                                                    }}
                                                                                    onMouseEnter={(e) => {
                                                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_BLUE;
                                                                                        (e.currentTarget as HTMLButtonElement).style.color = 'white';
                                                                                        (e.currentTarget as HTMLButtonElement).style.borderColor = PRIMARY_BLUE;
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = LIGHT_BLUE_BACKGROUND;
                                                                                        (e.currentTarget as HTMLButtonElement).style.color = PRIMARY_BLUE;
                                                                                        (e.currentTarget as HTMLButtonElement).style.borderColor = PRIMARY_BLUE;
                                                                                    }}
                                                                                    style={{
                                                                                        marginTop: '12px',
                                                                                        padding: '6px 12px',
                                                                                        backgroundColor: LIGHT_BLUE_BACKGROUND,
                                                                                        border: `1px solid ${PRIMARY_BLUE}`,
                                                                                        borderRadius: '6px',
                                                                                        color: PRIMARY_BLUE,
                                                                                        fontSize: '12px',
                                                                                        cursor: 'pointer',
                                                                                        fontWeight: '500',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                >
                                                                                    💬 Ask in Chat
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scroll to Top Button for FAQ */}
                                    {showScrollTop && (
                                        <button
                                            onClick={scrollToTop}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                            }}
                                            style={{
                                                position: 'absolute',
                                                bottom: '20px',
                                                right: '20px',
                                                width: '45px',
                                                height: '45px',
                                                borderRadius: '50%',
                                                backgroundColor: PRIMARY_BLUE,
                                                color: 'white',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px',
                                                transition: 'transform 0.2s ease',
                                                zIndex: 10
                                            }}
                                        >
                                            ⬆️
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Chat Section */}
                            {activeTab === 'chat' && (
                                <>
                                    {/* Chat Header with Clear Button */}
                                    <div
                                        style={{
                                            padding: '15px 20px',
                                            borderBottom: `1px solid ${BORDER_COLOR}`,
                                            backgroundColor: OFF_WHITE_BACKGROUND,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: '500', color: DARK_TEXT }}>
                                            Chat
                                        </span>
                                        {chatId && (
                                            <span style={{ fontSize: '12px', color: LIGHT_TEXT, backgroundColor: BORDER_COLOR, padding: '2px 8px', borderRadius: '12px' }}>
                                                ID: {chatId.substring(0, 8)}...
                                            </span>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {messages.length > 0 && (
                                                <button
                                                    onClick={clearChat}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2';
                                                        (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                                        (e.currentTarget as HTMLButtonElement).style.color = LIGHT_TEXT;
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: 'transparent',
                                                        border: `1px solid ${BORDER_COLOR}`,
                                                        color: LIGHT_TEXT,
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <span>🗑️</span>
                                                    Clear Chat
                                                </button>
                                            )}
                                            {/* Close button for Chat section */}
                                            <button
                                                onClick={() => setIsOpen(false)}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = BORDER_COLOR;
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                                }}
                                                style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    backgroundColor: 'transparent',
                                                    border: `1px solid ${BORDER_COLOR}`,
                                                    color: LIGHT_TEXT,
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'background-color 0.2s ease'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {/* Messages Area - This is the primary scrollable container for the Chat tab */}
                                    <div
                                        ref={chatMessagesContainerRef}
                                        data-messages-container
                                        style={{
                                            flex: 1,
                                            padding: '20px',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            scrollBehavior: 'smooth',
                                            minHeight: 0
                                        }}
                                    >
                                        {messages.length === 0 ? (
                                            <>
                                                <div style={{ textAlign: 'center', color: LIGHT_TEXT, fontSize: '14px', marginTop: '50px' }}>
                                                    Start a conversation by typing a message below or pick a suggestion:
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', alignItems: 'center' }}>
                                                    {suggestedQuestions.map((q, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => sendMessage(q)}
                                                            onMouseEnter={(e) => {
                                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = LIGHT_BLUE_BACKGROUND;
                                                                (e.currentTarget as HTMLButtonElement).style.borderColor = PRIMARY_BLUE;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
                                                                (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER_COLOR;
                                                            }}
                                                            style={{
                                                                padding: '10px 15px',
                                                                backgroundColor: 'white',
                                                                border: `1px solid ${BORDER_COLOR}`,
                                                                borderRadius: '20px',
                                                                color: PRIMARY_BLUE,
                                                                fontSize: '14px',
                                                                cursor: 'pointer',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease',
                                                                maxWidth: 'fit-content'
                                                            }}
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            messages.map((message, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                                                        marginBottom: '10px'
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            maxWidth: '85%',
                                                            padding: '12px 16px',
                                                            borderRadius: '18px',
                                                            backgroundColor: message.isUser ? PRIMARY_BLUE : OFF_WHITE_BACKGROUND,
                                                            color: message.isUser ? 'white' : MEDIUM_TEXT,
                                                            fontSize: '14px',
                                                            lineHeight: '1.5',
                                                            wordWrap: 'break-word',
                                                            whiteSpace: 'pre-wrap',
                                                            overflowWrap: 'break-word',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                                        }}
                                                    >
                                                        {message.isUser ? message.text : <span dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }} />}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {/* This empty div is solely for auto-scrolling to the end */}
                                        <div ref={messagesEndRef} />
                                        {isLoading && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
                                                <div
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderRadius: '18px',
                                                        backgroundColor: OFF_WHITE_BACKGROUND,
                                                        color: LIGHT_TEXT,
                                                        fontSize: '14px',
                                                        fontStyle: 'italic',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                                    }}
                                                >
                                                    Typing...
                                                </div>
                                            </div>
                                        )}

                                        {/* Display Follow-up Questions here AFTER messages and loading indicator */}
                                        {messages.length > 0 && followUpSuggestions.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '8px',
                                                marginTop: '15px',
                                                justifyContent: 'center',
                                                paddingTop: '10px',
                                                borderTop: `1px dashed ${BORDER_COLOR}`
                                            }}>
                                                {followUpSuggestions.map((suggestion, index) => (
                                                    <button
                                                        key={`follow-up-${index}`}
                                                        onClick={() => sendMessage(suggestion)}
                                                        onMouseEnter={(e) => {
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = LIGHT_BLUE_BACKGROUND;
                                                            (e.currentTarget as HTMLButtonElement).style.borderColor = PRIMARY_BLUE;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
                                                            (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER_COLOR;
                                                        }}
                                                        style={{
                                                            padding: '8px 12px',
                                                            backgroundColor: 'white',
                                                            border: `1px solid ${BORDER_COLOR}`,
                                                            borderRadius: '16px',
                                                            color: PRIMARY_BLUE,
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <div
                                        style={{
                                            padding: '20px',
                                            borderTop: `1px solid ${BORDER_COLOR}`,
                                            backgroundColor: OFF_WHITE_BACKGROUND,
                                            flexShrink: 0
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                            <textarea
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Type your message..."
                                                style={{
                                                    flex: 1,
                                                    padding: '12px 16px',
                                                    border: `1px solid ${BORDER_COLOR}`,
                                                    borderRadius: '20px',
                                                    fontSize: '14px',
                                                    resize: 'none',
                                                    minHeight: '44px',
                                                    maxHeight: '120px',
                                                    outline: 'none',
                                                    fontFamily: 'inherit',
                                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                                rows={1}
                                            />
                                            <button
                                                onClick={() => sendMessage()}
                                                disabled={!inputMessage.trim() || isLoading}
                                                onMouseEnter={(e) => {
                                                    if (!isLoading && inputMessage.trim()) {
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = GRADIENT_END;
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isLoading && inputMessage.trim()) {
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_BLUE;
                                                    }
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    backgroundColor: (!inputMessage.trim() || isLoading) ? BORDER_COLOR : PRIMARY_BLUE,
                                                    color: (!inputMessage.trim() || isLoading) ? LIGHT_TEXT : 'white',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    transition: 'background-color 0.2s ease',
                                                    minWidth: '60px'
                                                }}
                                            >
                                                {isLoading ? '⏳' : '➤'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Feedback Section */}
                            {activeTab === 'feedback' && (
                                <>
                                    {/* Feedback Header with Close Button */}
                                    <div
                                        style={{
                                            padding: '15px 20px',
                                            borderBottom: `1px solid ${BORDER_COLOR}`,
                                            backgroundColor: OFF_WHITE_BACKGROUND,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: '500', color: DARK_TEXT }}>
                                            Send Feedback
                                        </span>
                                        {/* Close button for Feedback section */}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = BORDER_COLOR;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                            }}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: 'transparent',
                                                border: `1px solid ${BORDER_COLOR}`,
                                                color: LIGHT_TEXT,
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background-color 0.2s ease'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Inner content wrapper for feedback form - This is the primary scrollable container */}
                                    <div
                                        ref={feedbackContentRef}
                                        style={{
                                            padding: '20px',
                                            flex: 1,
                                            overflowY: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minHeight: 0
                                        }}
                                    >
                                        <h3 style={{
                                            margin: '0 0 20px 0',
                                            fontSize: '20px',
                                            fontWeight: '600',
                                            color: DARK_TEXT,
                                            flexShrink: 0
                                        }}>
                                            Share Your Feedback
                                        </h3>

                                        <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                                            <label htmlFor="rating" style={{
                                                display: 'block',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: MEDIUM_TEXT,
                                                marginBottom: '8px'
                                            }}>
                                                Rate your experience:
                                            </label>
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                {renderStars(feedbackData.rating)}
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '20px', flex: 1, minHeight: 0 }}>
                                            <label htmlFor="feedbackText" style={{
                                                display: 'block',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: MEDIUM_TEXT,
                                                marginBottom: '8px'
                                            }}>
                                                Additional Comments:
                                            </label>
                                            <textarea
                                                id="feedbackText"
                                                value={feedbackData.feedback}
                                                onChange={(e) => setFeedbackData(prev => ({ ...prev, feedback: e.target.value }))}
                                                placeholder="Tell us about your experience..."
                                                rows={5}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: `1px solid ${BORDER_COLOR}`,
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit',
                                                    outline: 'none',
                                                    flex: 1,
                                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            ></textarea>
                                        </div>

                                        <button
                                            onClick={submitFeedback}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = GRADIENT_END;
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = PRIMARY_BLUE;
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '12px 20px',
                                                backgroundColor: PRIMARY_BLUE,
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s ease',
                                                marginTop: 'auto',
                                                flexShrink: 0
                                            }}
                                        >
                                            Submit Feedback
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalChatbot;