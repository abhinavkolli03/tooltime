import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableWithoutFeedback, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
}

export default function Input({ label, error, leftIcon, rightIcon, containerStyle, style, ...props }: InputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        if (props.onFocus) props.onFocus(e);
    };
    const handleBlur = (e: any) => {
        setIsFocused(false);
        if (props.onBlur) props.onBlur(e);
    };

    return (
        <View style={[{ width: '100%' }, containerStyle]}>
            {label && (
                <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: COLORS.text.muted, marginBottom: 8 }}>
                    {label}
                </Text>
            )}
            <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                <View
                    style={{
                        height: 52,
                        borderWidth: 1,
                        borderColor: error ? COLORS.semantic.error : isFocused ? COLORS.accent.primary : '#E0D4C0',
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        backgroundColor: COLORS.surface,
                    }}
                >
                    {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
                    <TextInput
                        ref={inputRef}
                        style={[{
                            flex: 1,
                            fontFamily: 'DMSans-Regular',
                            fontSize: 16,
                            color: COLORS.text.primary,
                            height: '100%',
                        }, style]}
                        placeholderTextColor={COLORS.text.muted}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        {...props}
                    />
                    {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
                </View>
            </TouchableWithoutFeedback>
            {error && (
                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: COLORS.semantic.error, marginTop: 4 }}>
                    {error}
                </Text>
            )}
        </View>
    );
}
