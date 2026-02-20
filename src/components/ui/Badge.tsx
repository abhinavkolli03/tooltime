import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '@/constants/theme';

interface BadgeProps {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
    style?: StyleProp<ViewStyle>;
}

export default function Badge({ label, variant = 'default', style }: BadgeProps) {
    const getBackgroundColor = () => {
        switch (variant) {
            case 'success': return 'rgba(46, 125, 50, 0.1)';
            case 'warning': return 'rgba(237, 108, 2, 0.1)';
            case 'error': return 'rgba(211, 47, 47, 0.1)';
            case 'info': return 'rgba(2, 136, 209, 0.1)';
            case 'accent': return 'rgba(196, 98, 42, 0.1)';
            default: return '#E0D4C0';
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'success': return COLORS.semantic.success;
            case 'warning': return COLORS.semantic.warning;
            case 'error': return COLORS.semantic.error;
            case 'info': return COLORS.semantic.info;
            case 'accent': return COLORS.accent.primary;
            default: return COLORS.text.primary;
        }
    };

    return (
        <View
            style={[{
                backgroundColor: getBackgroundColor(),
                borderRadius: 20,
                paddingVertical: 5,
                paddingHorizontal: 12,
                alignSelf: 'flex-start',
            }, style]}
        >
            <Text
                style={{
                    fontFamily: 'JetBrainsMono-Regular',
                    fontSize: 10,
                    color: getTextColor(),
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>
        </View>
    );
}
