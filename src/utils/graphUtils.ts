/**
 * Utility to identify if a string is a UUID.
 */
export const isUUID = (str: string | undefined | null): boolean => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

/**
 * Strip folder isolation suffixes like _F_uuid.
 */
export const cleanLabel = (label: string | undefined | null): string => {
    if (!label) return 'Unknown';
    if (label.includes('_F_')) {
        return label.split('_F_')[0];
    }
    return label;
};

/**
 * Robustly formats a node's display name, falling back to type or truncated ID 
 * if the primary name is missing or is just a technical UUID.
 */
export const formatDisplayName = (node: { name?: string; type?: string; id?: string; properties?: Record<string, any> }): string => {
    // 1. Check direct name property
    if (node.name && !isUUID(node.name)) return node.name;

    // 2. Check common descriptive properties in properties object
    const props = node.properties || {};
    const fallbackNames = [
        props.name,
        props.label,
        props.title,
        props.display_name,
        props.herb,
        props.quality,
        props.property,
        props.value,
        props.text
    ];

    for (const val of fallbackNames) {
        if (val && typeof val === 'string' && !isUUID(val)) return val;
    }

    // 3. Fallback to type (Cleaned)
    const type = cleanLabel(node.type);
    if (type && type !== 'Entity' && type !== 'Unknown') return type;

    // 4. Default to ID snippet
    return node.id ? node.id.slice(0, 8) : 'Unknown';
};
