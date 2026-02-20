import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { useBookingStore } from '@/store/bookingStore';

const { width } = Dimensions.get('window');

export default function BorrowerTabBar({ state, descriptors, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { activeBooking } = useBookingStore();

    const getIcon = (name: string, isFocused: boolean) => {
        switch (name) {
            case 'discover': return isFocused ? 'compass' : 'compass-outline';
            case 'rentals': return isFocused ? 'cube' : 'cube-outline';
            case 'messages': return isFocused ? 'chatbubbles' : 'chatbubbles-outline';
            case 'profile': return isFocused ? 'person' : 'person-outline';
            default: return 'help-circle';
        }
    };

    const getLabel = (name: string) => {
        switch (name) {
            case 'discover': return 'Discover';
            case 'rentals': return 'Rentals';
            case 'messages': return 'Messages';
            case 'profile': return 'Profile';
            default: return name;
        }
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom || 20 }]}>
            {state.routes.filter((r: any) => !['tool/[toolId]', 'track'].includes(r.name)).map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const label = getLabel(route.name);
                const isFocused = state.routes[state.index].name === route.name;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                return (
                    <TouchableOpacity
                        key={index}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tabItem}
                        activeOpacity={0.7}
                    >
                        <View>
                            <Ionicons
                                name={getIcon(route.name, isFocused) as any}
                                size={24}
                                color={isFocused ? COLORS.accent.primary : '#9A8070'}
                            />
                            {route.name === 'track' && activeBooking && (
                                <View style={styles.badge} />
                            )}
                        </View>
                        <Text style={[
                            styles.label,
                            { color: isFocused ? COLORS.accent.primary : '#9A8070' }
                        ]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 83,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0D4C0',
        alignItems: 'center',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    label: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 10,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.accent.primary,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    }
});
