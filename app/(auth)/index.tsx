import { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        title: 'TOOLTIME',
        subtitle: 'Your neighborhood toolbox, on demand.',
        // In a real app we'd map to a local asset, using a placeholder for illustration
        illustration: true,
    },
    {
        id: '2',
        bullets: [
            {
                icon: 'location',
                title: 'Nearby tools',
                desc: 'Find exactly what you need blocks away.',
                color: '#EA4335'
            },
            {
                icon: 'shield-checkmark',
                title: 'Secure deposit',
                desc: 'Peace of mind for every rental.',
                color: '#EA4335'
            },
            {
                icon: 'car',
                title: 'Lender delivers',
                desc: 'Convenient drop-off and pick-up.',
                color: '#EA4335'
            },
        ]
    }
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg.primary }}>
            <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={slides}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                    renderItem={({ item }) => (
                        <View style={{ width, paddingHorizontal: 24, paddingTop: 40 }}>
                            {item.illustration && (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="hammer" size={80} color={COLORS.accent.primary} />
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
                                        <Ionicons name="hammer-outline" size={32} color={COLORS.accent.primary} style={{ marginRight: 8 }} />
                                        <Text style={{ fontFamily: 'DMSerifDisplay-Regular', fontSize: 36, color: COLORS.text.primary, letterSpacing: 1 }}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 18, color: COLORS.text.secondary, textAlign: 'center', marginTop: 12 }}>
                                        {item.subtitle}
                                    </Text>
                                </View>
                            )}
                            {item.bullets && (
                                <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
                                    {item.bullets.map((b: any, idx: number) => (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderCurve: 'continuous', shadowColor: '#1C1410', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FDECEB', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                                <Ionicons name={b.icon as any} size={24} color={COLORS.accent.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary, marginBottom: 4 }}>
                                                    {b.title}
                                                </Text>
                                                <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted }}>
                                                    {b.desc}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                />
            </View>

            {/* Footer */}
            <View style={{ padding: 24, paddingBottom: 16 }}>
                {/* Paginator Dots */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
                    {slides.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                height: 8,
                                width: 8,
                                borderRadius: 4,
                                backgroundColor: i === currentIndex ? COLORS.accent.primary : '#D4B896',
                                marginHorizontal: 4,
                            }}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/(auth)/signup')}
                    style={{
                        backgroundColor: COLORS.accent.primary,
                        height: 56,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#1C1410',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.surface }}>Get Started</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                    <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: COLORS.text.muted }}>
                        Already have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: COLORS.accent.dark }}>Log In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
