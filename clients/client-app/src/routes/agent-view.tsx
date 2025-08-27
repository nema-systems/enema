import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { 
  ChatBubbleBottomCenterTextIcon,
  PaperAirplaneIcon,
  UserIcon,
  ComputerDesktopIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import NemaLogo from "../icons/nema-logo";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AgentView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          type: "assistant",
          content: "Hello! I'm your NEMA Agent, here to help you with your requirements management workflow. You can ask me about:\n\n• Creating and managing requirements\n• Working with modules and collections\n• Setting up test cases\n• Analyzing parameters\n• Managing your workspace\n\nHow can I assist you today?",
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: generateMockResponse(userMessage.content),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const generateMockResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes("requirement") || input.includes("req")) {
      return "I can help you with requirements management! Here are some things I can assist with:\n\n• Creating new requirements with proper structure\n• Organizing requirements into collections\n• Setting up requirement hierarchies\n• Managing requirement versions and status\n• Linking requirements to test cases\n\nWhat specific requirement task would you like help with?";
    }
    
    if (input.includes("module")) {
      return "Modules are great for organizing your requirements! I can help you:\n\n• Create new shared modules\n• Configure module rules and descriptions\n• Link modules to requirement collections\n• Set up module parameters\n• Manage module sharing across products\n\nWould you like me to walk you through creating a new module?";
    }
    
    if (input.includes("test") || input.includes("testing")) {
      return "Testing is crucial for requirement validation! I can assist with:\n\n• Creating comprehensive test cases\n• Linking test cases to requirements\n• Setting up test execution workflows\n• Managing test assets and evidence\n• Organizing tests with tags and groups\n\nWhat aspect of testing would you like to explore?";
    }
    
    if (input.includes("parameter")) {
      return "Parameters help make your requirements flexible and reusable! I can help you:\n\n• Define parameter types and values\n• Create parameter alternatives for different scenarios\n• Link parameters to requirements\n• Manage parameter versioning\n• Set up parameter groups\n\nWhat parameters do you need to configure?";
    }
    
    if (input.includes("workspace") || input.includes("organization")) {
      return "Workspace management is important for team collaboration! I can help with:\n\n• Setting up workspace permissions\n• Managing team access and roles\n• Organizing products within workspaces\n• Configuring workspace settings\n• Best practices for workspace structure\n\nWhat workspace configuration do you need assistance with?";
    }
    
    if (input.includes("help") || input.includes("how") || input.includes("what")) {
      return "I'm here to help with all aspects of your requirements management workflow! Some popular topics include:\n\n🔹 **Requirements**: Creating, organizing, and managing requirements\n🔹 **Modules**: Setting up shared modules and configurations\n🔹 **Testing**: Building comprehensive test suites\n🔹 **Parameters**: Making requirements flexible with parameters\n🔹 **Workflow**: Best practices and optimization tips\n\nFeel free to ask about any specific task or concept!";
    }
    
    // Default responses
    const responses = [
      "That's an interesting question! While I'm currently in development mode, I can provide guidance on requirements management best practices. Could you be more specific about what you'd like to accomplish?",
      "I understand you're looking for help with that. As a requirements management assistant, I can offer insights on workflows, best practices, and system capabilities. What specific area would you like to explore?",
      "Thanks for your question! I'm designed to help with requirements engineering and management tasks. Could you tell me more about your specific goals or challenges?",
      "I'm here to assist with your requirements management needs! While my backend integration is still being developed, I can provide guidance on methodologies and approaches. What would you like to focus on?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    {
      icon: DocumentTextIcon,
      label: "Create Requirement",
      description: "Help me create a new requirement"
    },
    {
      icon: CubeIcon,
      label: "Setup Module",
      description: "Guide me through module creation"
    },
    {
      icon: ClipboardDocumentListIcon,
      label: "Design Tests",
      description: "Create test cases for requirements"
    },
    {
      icon: AdjustmentsHorizontalIcon,
      label: "Configure Parameters",
      description: "Set up requirement parameters"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 mr-4">
            <ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">NEMA Agent</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Your AI assistant for requirements management</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                <ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Start a conversation</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Ask me anything about requirements management, testing, or workspace organization.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-3xl ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex-shrink-0 ${message.type === "user" ? "ml-3" : "mr-3"}`}>
                    {message.type === "user" ? (
                      user?.imageUrl ? (
                        <img
                          src={user.imageUrl}
                          alt={user.firstName || "User"}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center p-1.5">
                        <div className="h-full w-full">
                          <NemaLogo />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                    <div className={`text-xs mt-2 ${
                      message.type === "user" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-3xl">
                <div className="mr-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center p-1.5">
                    <div className="h-full w-full">
                      <NemaLogo />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick actions:</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(action.description)}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <action.icon className="h-5 w-5 text-gray-600 dark:text-gray-400 mb-2" />
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about requirements, testing, modules, or anything else..."
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none disabled:opacity-50"
                rows={1}
                style={{ maxHeight: '120px', minHeight: '48px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="flex-shrink-0 p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            NEMA Agent is in development. Responses are simulated and not connected to a live backend.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentView;