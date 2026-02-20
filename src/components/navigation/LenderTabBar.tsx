import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { useIncomingRequests } from '@/hooks/useIncomingRequests';

export default function LenderTabBar({ state, descriptors, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { count: pendingCount } = useIncomingRequests();

    const getIcon = (name: string, isFocused: boolean) => {
        switch (name) {
            case 'dashboard': return isFocused ? 'grid' : 'grid-outline';
            case 'listings': return isFocused ? 'construct' : 'construct-outline';
            case 'requests': return isFocused ? 'mail' : 'mail-outline';
            case 'earnings': return isFocused ? 'wallet' : 'wallet-outline';
            case 'profile': return isFocused ? 'person' : 'person-outline';
            default: return 'help-circle';
        }
    };

    const getLabel = (name: string) => {
        switch (name) {
            case 'dashboard': return 'Home';
            case 'listings': return 'Tools';
            case 'requests': return 'Requests';
            case 'earnings': return 'Earnings';
            case 'profile': return 'Profile';
            default: return name;
        }
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom || 20 }]}>
            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const label = getLabel(route.name);
                const isFocused = state.index === index;

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

                return (
                    <TouchableOpacity
                        key={index}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        style={styles.tabItem}
                        activeOpacity={0.7}
                    >
                        <View>
                            <Ionicons
                                name={getIcon(route.name, isFocused) as any}
                                size={24}
                                color={isFocused ? COLORS.accent.primary : '#9A8070'}
                            />
                            {route.name === 'requests' && pendingCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{pendingCount}</Text>
                                </View>
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
        top: -4,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#B84040',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        paddingHorizontal: 3,
    },
    badgeText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: '700',
    }
});
