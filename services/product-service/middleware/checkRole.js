const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
        return res
            .status(403)
            .json({ message: "Forbidden: User role not available." });
        }

        const userRole = req.user.role;

        if (userRole !== requiredRole) {
        return res
            .status(403)
            .json({ message: "Forbidden: Insufficient permissions." });
        }

        next();
    };
};
  
module.exports = checkRole;
