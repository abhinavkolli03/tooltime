import React, { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Animated, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '@/constants/theme';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'ghost';
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    size?: 'sm' | 'md' | 'lg';
    style?: StyleProp<ViewStyle>;
}

export default function Button({
    variant = 'primary',
    label,
    onPress,
    loading = false,
    disabled = false,
    fullWidth = true,
    size = 'md',
    style,
}: ButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const getHeight = () => {
        if (size === 'sm') return 40;
        if (size === 'lg') return 60;
        return 52;
    };

    const getBackgroundColor = () => {
        if (variant === 'primary') return COLORS.accent.primary;
        return 'transparent';
    };

    const getBorderColor = () => {
        if (variant === 'secondary') return COLORS.accent.primary;
        return 'transparent';
    };

    const getTextColor = () => {
        if (variant === 'primary') return COLORS.surface;
        return COLORS.accent.primary;
    };

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                style={{
                    height: getHeight(),
                    backgroundColor: getBackgroundColor(),
                    borderWidth: variant === 'secondary' ? 2 : 0,
                    borderColor: getBorderColor(),
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: disabled ? 0.5 : 1,
                    flexDirection: 'row',
                    paddingHorizontal: 16,
                }}
                activeOpacity={1}
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'primary' ? COLORS.surface : COLORS.accent.primary} />
                ) : (
                    <Text
                        style={{
                            fontFamily: 'DMSans-Medium',
                            fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16,
                            color: getTextColor(),
                        }}
                    >
                        {label}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}
