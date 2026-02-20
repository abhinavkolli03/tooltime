import React from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { COLORS, SHADOW } from '@/constants/theme';

interface CardProps {
    children: React.ReactNode;
    onPress?: () => void;
    padding?: number;
    radius?: number;
    shadow?: 'sm' | 'md' | 'lg';
    style?: StyleProp<ViewStyle>;
}

export default function Card({
    children,
    onPress,
    padding = 16,
    radius = 16,
    shadow = 'md',
    style,
}: CardProps) {
    const cardStyle = [
        {
            backgroundColor: COLORS.surface,
            padding,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: '#E0D4C0',
        },
        shadow === 'sm' ? SHADOW.sm : shadow === 'md' ? SHADOW.md : SHADOW.lg,
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={cardStyle}>
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
}
