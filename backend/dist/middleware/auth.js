import jwt from "jsonwebtoken";
export function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }
    const token = header.slice("Bearer ".length);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({
            success: false,
            message: "Authentication is not configured",
        });
    }
    try {
        const payload = jwt.verify(token, secret);
        req.user = {
            id: payload.sub,
            role: payload.role,
        };
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
}
export function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource",
            });
        }
        next();
    };
}
