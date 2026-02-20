import React, { useState } from 'react';
import { View, Image, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/theme';
import Badge from '../ui/Badge';

interface ToolCarouselProps {
    photoUrls: string[];
    condition?: string;
}

export default function ToolCarousel({ photoUrls, condition }: ToolCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { width } = Dimensions.get('window');
    const HEIGHT = width * 0.8; // Aspect ratio 5:4

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / width);
        setCurrentIndex(index);
    };

    const images = photoUrls.length > 0 ? photoUrls : ['https://via.placeholder.com/400'];

    return (
        <View style={{ width, height: HEIGHT, position: 'relative' }}>
            <FlatList
                data={images}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: item }}
                        style={{ width, height: HEIGHT, resizeMode: 'cover', backgroundColor: '#F0EBE1' }}
                    />
                )}
            />

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }}
            />

            {condition && (
                <View style={{ position: 'absolute', top: 16, right: 16 }}>
                    <Badge label={`Condition: ${condition.replace('_', ' ')}`} variant="success" />
                </View>
            )}

            {images.length > 1 && (
                <View style={{ flexDirection: 'row', position: 'absolute', bottom: 16, width: '100%', justifyContent: 'center' }}>
                    {images.map((_, index) => (
                        <View
                            key={index}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: currentIndex === index ? COLORS.accent.primary : '#D4B896',
                                marginHorizontal: 3,
                            }}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
