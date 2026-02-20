import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS } from '@/constants/theme';
import { BookingStatus } from '@/types/booking.types';

interface ProgressStepperProps {
    currentStatus: BookingStatus;
}

export default function ProgressStepper({ currentStatus }: ProgressStepperProps) {
    let stepIndex = 0;
    if (currentStatus === 'pending') stepIndex = 0;
    if (currentStatus === 'accepted') stepIndex = 1;
    if (currentStatus === 'active') stepIndex = 2;
    if (currentStatus === 'completed') stepIndex = 3;

    const steps = ['Pending', 'Accepted', 'Active', 'Completed'];

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }}>
            {steps.map((label, index) => {
                const isCompleted = index < stepIndex;
                const isCurrent = index === stepIndex;

                return (
                    <React.Fragment key={index}>
                        <View style={{ alignItems: 'center' }}>
                            <Animated.View
                                style={[
                                    {
                                        width: 16,
                                        height: 16,
                                        borderRadius: 8,
                                        backgroundColor: isCompleted || isCurrent ? COLORS.accent.primary : COLORS.surface,
                                        borderWidth: isCurrent || isCompleted ? 0 : 2,
                                        borderColor: '#E0D4C0',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    },
                                    isCurrent && { transform: [{ scale: pulseAnim }], shadowColor: COLORS.accent.primary, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 }
                                ]}
                            />
                            <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: isCurrent ? COLORS.text.primary : COLORS.text.muted, marginTop: 8 }}>
                                {label}
                            </Text>
                        </View>
                        {index < steps.length - 1 && (
                            <View style={{ flex: 1, height: 2, backgroundColor: index < stepIndex ? COLORS.accent.primary : '#E0D4C0', marginHorizontal: 8, marginTop: -24 }} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}
