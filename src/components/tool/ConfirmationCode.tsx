import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface ConfirmationCodeProps {
    code: string;
    expiresAt: Date;
    status: 'active' | 'expired' | 'used';
}

export default function ConfirmationCode({ code, expiresAt, status }: ConfirmationCodeProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (status !== 'active') return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = expiresAt.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('00:00');
                clearInterval(interval);
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, status]);

    const digits = code.padEnd(4, ' ').split('');

    const getBorderColor = () => {
        if (status === 'used') return COLORS.semantic.success;
        if (status === 'expired') return COLORS.text.muted;
        return COLORS.accent.primary;
    };

    return (
        <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {digits.map((digit, idx) => (
                    <View
                        key={idx}
                        style={{
                            width: 64,
                            height: 72,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: getBorderColor(),
                            backgroundColor: COLORS.surface,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        {status === 'used' ? (
                            <Ionicons name="checkmark" size={32} color={COLORS.semantic.success} />
                        ) : (
                            <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 32, color: status === 'expired' ? COLORS.text.muted : COLORS.text.primary }}>
                                {digit}
                            </Text>
                        )}
                    </View>
                ))}
            </View>

            {status === 'active' && (
                <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: COLORS.text.muted }}>
                    Expires in {timeLeft}
                </Text>
            )}
            {status === 'expired' && (
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.semantic.error }}>
                    Code Expired
                </Text>
            )}
            {status === 'used' && (
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.semantic.success }}>
                    Hand-off Confirmed
                </Text>
            )}
        </View>
    );
}
