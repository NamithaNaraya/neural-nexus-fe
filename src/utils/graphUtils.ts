/**
 * Utility to identify if a string is a UUID.
 */
export const isUUID = (str: string | undefined | null): boolean => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

/**
 * Robustly formats a node's display name, falling back to type or truncated ID 
 * if the primary name is missing or is just a technical UUID.
 */
export const formatDisplayName = (node: { name?: string; type?: string; id?: string }): string => {
    if (!node.name || isUUID(node.name)) {
        if (node.type && !isUUID(node.type)) {
            return node.type;
        }
        return node.id ? node.id.slice(0, 8) : 'Unknown';
    }
    return node.name;
};
