/**
 * Onboarding Overlay
 * 
 * Guided tour for first-time users.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { onboardingSteps, ONBOARDING_COMPLETE_KEY, OnboardingStep } from './onboardingSteps';

interface OnboardingOverlayProps {
    onComplete?: () => void;
    forceShow?: boolean;
}

export function OnboardingOverlay({ onComplete, forceShow = false }: OnboardingOverlayProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

    // Check if onboarding was completed
    useEffect(() => {
        const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
        if (!completed || forceShow) {
            setIsVisible(true);
        }
    }, [forceShow]);

    // Update highlight position when step changes
    useEffect(() => {
        const step = onboardingSteps[currentStep];
        if (step?.targetSelector) {
            const element = document.querySelector(step.targetSelector);
            if (element) {
                setHighlightRect(element.getBoundingClientRect());
            } else {
                setHighlightRect(null);
            }
        } else {
            setHighlightRect(null);
        }
    }, [currentStep]);

    const handleNext = useCallback(() => {
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    }, [currentStep]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleSkip = useCallback(() => {
        handleComplete();
    }, []);

    const handleComplete = useCallback(() => {
        localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        setIsVisible(false);
        onComplete?.();
    }, [onComplete]);

    if (!isVisible) return null;

    const step = onboardingSteps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === onboardingSteps.length - 1;

    // Calculate tooltip position
    const getTooltipPosition = (): React.CSSProperties => {
        if (!highlightRect || step.position === 'center') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const padding = 20;
        const positions: Record<string, React.CSSProperties> = {
            top: {
                bottom: `calc(100% - ${highlightRect.top - padding}px)`,
                left: highlightRect.left + highlightRect.width / 2,
                transform: 'translateX(-50%)',
            },
            bottom: {
                top: highlightRect.bottom + padding,
                left: highlightRect.left + highlightRect.width / 2,
                transform: 'translateX(-50%)',
            },
            left: {
                top: highlightRect.top + highlightRect.height / 2,
                right: `calc(100% - ${highlightRect.left - padding}px)`,
                transform: 'translateY(-50%)',
            },
            right: {
                top: highlightRect.top + highlightRect.height / 2,
                left: highlightRect.right + padding,
                transform: 'translateY(-50%)',
            },
        };

        return positions[step.position || 'bottom'] || positions.bottom;
    };

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* Highlight cutout */}
            {highlightRect && (
                <div
                    className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none z-[101]"
                    style={{
                        top: highlightRect.top - 8,
                        left: highlightRect.left - 8,
                        width: highlightRect.width + 16,
                        height: highlightRect.height + 16,
                    }}
                >
                    <div className="absolute inset-0 rounded-lg animate-pulse border-2 border-primary/50" />
                </div>
            )}

            {/* Tooltip */}
            <div
                className="absolute z-[102] max-w-md"
                style={getTooltipPosition()}
            >
                <div className="bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">{step.title}</h3>
                        </div>
                        <button
                            onClick={handleSkip}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                    </p>

                    {/* Progress */}
                    <div className="flex items-center gap-1.5">
                        {onboardingSteps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${i === currentStep
                                        ? 'w-6 bg-primary'
                                        : i < currentStep
                                            ? 'w-1.5 bg-primary/50'
                                            : 'w-1.5 bg-muted'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={handleSkip}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Skip tour
                        </button>

                        <div className="flex items-center gap-2">
                            {!isFirstStep && (
                                <button
                                    onClick={handlePrev}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                {isLastStep ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Get Started
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Hook to trigger onboarding
export function useOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(false);

    const startTour = useCallback(() => {
        setShowOnboarding(true);
    }, []);

    const resetOnboarding = useCallback(() => {
        localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
        setShowOnboarding(true);
    }, []);

    return {
        showOnboarding,
        setShowOnboarding,
        startTour,
        resetOnboarding,
        OnboardingComponent: showOnboarding ? (
            <OnboardingOverlay
                forceShow={true}
                onComplete={() => setShowOnboarding(false)}
            />
        ) : null,
    };
}
