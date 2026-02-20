import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    size?: number;
    readonly?: boolean;
    style?: StyleProp<ViewStyle>;
}

export default function StarRating({ rating, onRatingChange, size = 32, readonly = true, style }: StarRatingProps) {
    const handlePress = (newRating: number) => {
        if (!readonly && onRatingChange) {
            onRatingChange(newRating);
        }
    };

    const renderStar = (index: number) => {
        const isFull = rating >= index;
        const isHalf = !isFull && rating >= index - 0.5;

        return (
            <TouchableOpacity
                key={index}
                disabled={readonly}
                onPress={() => handlePress(index)}
                activeOpacity={0.7}
                style={{ marginHorizontal: 2 }}
            >
                <Ionicons
                    name={isFull ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                    size={size}
                    color={isFull || isHalf ? '#F5A623' : '#D4B896'}
                />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
            {[1, 2, 3, 4, 5].map(index => renderStar(index))}
        </View>
    );
}
