/**
 * Command Palette Provider
 * 
 * Provides the Command Palette throughout the application.
 * Wrap your app with this provider to enable global Ctrl+K access.
 */
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { CommandPalette, CommandItem } from './CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

interface CommandPaletteContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function useCommandPaletteContext() {
    const context = useContext(CommandPaletteContext);
    if (!context) {
        throw new Error('useCommandPaletteContext must be used within CommandPaletteProvider');
    }
    return context;
}

interface CommandPaletteProviderProps {
    children: ReactNode;
    additionalCommands?: CommandItem[];
}

export function CommandPaletteProvider({
    children,
    additionalCommands = [],
}: CommandPaletteProviderProps) {
    const {
        isOpen,
        open,
        close,
        toggle,
        buildCommands,
        handleAction,
    } = useCommandPalette();

    // Merge default commands with additional commands
    const allCommands = React.useMemo(() => {
        const baseCommands = buildCommands();
        return [...baseCommands, ...additionalCommands];
    }, [buildCommands, additionalCommands]);

    return (
        <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
            <CommandPalette
                isOpen={isOpen}
                onClose={close}
                commands={allCommands}
                onAction={handleAction}
            />
        </CommandPaletteContext.Provider>
    );
}

export default CommandPaletteProvider;
