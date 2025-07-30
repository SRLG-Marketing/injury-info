/**
 * Authentication Middleware for Analytics Dashboard
 * 
 * Provides server-side authentication to protect analytics endpoints
 * from unauthorized access.
 */

export class AuthMiddleware {
    constructor(config = {}) {
        // Default credentials - CHANGE THESE IN PRODUCTION
        this.credentials = config.credentials || {
            username: 'admin',
            password: 'analytics2024!'
        };
        
        // Session timeout (4 hours)
        this.sessionTimeout = config.sessionTimeout || 4 * 60 * 60 * 1000;
        
        // Store active sessions (in production, use Redis or database)
        this.activeSessions = new Map();
        
        console.log('🔐 Auth middleware initialized');
    }

    /**
     * Generate a session token
     */
    generateToken(username) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return btoa(`${username}:${timestamp}:${random}`);
    }

    /**
     * Validate a session token
     */
    validateToken(token) {
        try {
            const decoded = atob(token);
            const [username, timestamp, random] = decoded.split(':');
            
            if (!username || !timestamp || !random) {
                return false;
            }

            const sessionAge = Date.now() - parseInt(timestamp);
            
            // Check if session has expired
            if (sessionAge > this.sessionTimeout) {
                this.activeSessions.delete(token);
                return false;
            }

            // Check if session exists in active sessions
            if (!this.activeSessions.has(token)) {
                return false;
            }

            return { username, timestamp: parseInt(timestamp) };
            
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    /**
     * Authenticate user credentials
     */
    authenticateUser(username, password) {
        return username === this.credentials.username && 
               password === this.credentials.password;
    }

    /**
     * Create a new session
     */
    createSession(username) {
        const token = this.generateToken(username);
        const sessionData = {
            username,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        this.activeSessions.set(token, sessionData);
        
        // Clean up expired sessions periodically
        this.cleanupExpiredSessions();
        
        return token;
    }

    /**
     * Update session activity
     */
    updateSessionActivity(token) {
        const session = this.activeSessions.get(token);
        if (session) {
            session.lastActivity = Date.now();
            this.activeSessions.set(token, session);
        }
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [token, session] of this.activeSessions.entries()) {
            if (now - session.lastActivity > this.sessionTimeout) {
                this.activeSessions.delete(token);
            }
        }
    }

    /**
     * Express middleware for authentication
     */
    requireAuth() {
        return (req, res, next) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'Please provide a valid authentication token'
                });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            const session = this.validateToken(token);
            
            if (!session) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token',
                    message: 'Please login again'
                });
            }

            // Update session activity
            this.updateSessionActivity(token);
            
            // Add user info to request
            req.user = {
                username: session.username,
                token: token
            };
            
            next();
        };
    }

    /**
     * Login endpoint handler
     */
    handleLogin() {
        return (req, res) => {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing credentials',
                    message: 'Username and password are required'
                });
            }

            if (this.authenticateUser(username, password)) {
                const token = this.createSession(username);
                
                res.json({
                    success: true,
                    token,
                    user: { username },
                    message: 'Login successful',
                    sessionTimeout: this.sessionTimeout
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    message: 'Username or password is incorrect'
                });
            }
        };
    }

    /**
     * Logout endpoint handler
     */
    handleLogout() {
        return (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                this.activeSessions.delete(token);
            }
            
            res.json({
                success: true,
                message: 'Logout successful'
            });
        };
    }

    /**
     * Get session info
     */
    handleSessionInfo() {
        return (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'No session found'
                });
            }

            const token = authHeader.substring(7);
            const session = this.validateToken(token);
            
            if (!session) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid session'
                });
            }

            const sessionData = this.activeSessions.get(token);
            
            res.json({
                success: true,
                user: {
                    username: session.username
                },
                session: {
                    createdAt: sessionData.createdAt,
                    lastActivity: sessionData.lastActivity,
                    expiresAt: sessionData.createdAt + this.sessionTimeout
                }
            });
        };
    }

    /**
     * Get authentication status
     */
    getAuthStatus() {
        return {
            activeSessions: this.activeSessions.size,
            sessionTimeout: this.sessionTimeout,
            credentialsConfigured: !!(this.credentials.username && this.credentials.password)
        };
    }
} 