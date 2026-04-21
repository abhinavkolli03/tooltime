import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useMyListings } from '@/hooks/useMyListings';
import { SkeletonBox } from '@/components/ui/SkeletonLoader';
import { COLORS } from '@/constants/theme';
import { Tool } from '@/types/tool.types';

export default function ListingsScreen() {
    const { listings, isLoading } = useMyListings();

    const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;

    const renderItem = ({ item }: { item: Tool }) => (
        <TouchableOpacity style={styles.card} onPress={() => Alert.alert(item.name, 'Edit and delete coming soon!\nThis tool is currently ' + (item.isAvailable ? 'available' : 'rented out') + '.')}>
            <Image source={{ uri: item.photoUrls?.[0] }} style={styles.toolImg} contentFit="cover" />
            <View style={styles.cardBody}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.toolName}>{item.name}</Text>
                    <Text style={styles.toolCategory}>{item.category.replace('_', ' ').toUpperCase()}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{formatCents(item.hourlyRate)}/hr</Text>
                        <Text style={styles.priceSep}>•</Text>
                        <Text style={styles.priceLabel}>{formatCents(item.dailyRate)}/day</Text>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <View style={[styles.statusPill, { backgroundColor: item.isAvailable ? '#E8F5E2' : '#FFF0E6' }]}>
                        <View style={[styles.statusDot, { backgroundColor: item.isAvailable ? '#5A7A4A' : COLORS.accent.primary }]} />
                        <Text style={[styles.statusLabel, { color: item.isAvailable ? '#5A7A4A' : COLORS.accent.primary }]}>
                            {item.isAvailable ? 'Available' : 'Rented'}
                        </Text>
                    </View>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#D98634" />
                        <Text style={styles.ratingText}>{item.rating} ({item.rentalCount})</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <SkeletonBox width={40} height={40} borderRadius={20} />
                    <SkeletonBox width={120} height={28} borderRadius={8} />
                    <SkeletonBox width={100} height={40} borderRadius={12} />
                </View>
                <View style={{ paddingHorizontal: 24 }}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden' }}>
                            <SkeletonBox width="100%" height={160} borderRadius={0} />
                            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <SkeletonBox width={140} height={16} borderRadius={6} style={{ marginBottom: 6 }} />
                                    <SkeletonBox width={100} height={12} borderRadius={6} />
                                </View>
                                <SkeletonBox width={70} height={24} borderRadius={12} />
                            </View>
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>My Tools</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/modals/list-tool')}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>List Tool</Text>
                </TouchableOpacity>
            </View>

            {listings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="construct-outline" size={64} color="#EDE4D4" />
                    <Text style={styles.emptyTitle}>No tools listed</Text>
                    <Text style={styles.emptySub}>Start earning by listing your first tool for others to rent.</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/modals/list-tool')}>
                        <Text style={styles.primaryBtnText}>List Your First Tool</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={listings}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 16,
    },
    title: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.accent.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    },
    addBtnText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#FFFFFF' },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
        borderWidth: 1, borderColor: '#F5F0E8', overflow: 'hidden',
    },
    toolImg: { width: '100%', height: 160, backgroundColor: '#F5F0E8' },
    cardBody: {
        flexDirection: 'row', padding: 16, alignItems: 'center',
    },
    toolName: { fontFamily: 'DMSans-Medium', fontSize: 16, color: COLORS.text.primary },
    toolCategory: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: '#9A8070', marginTop: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    priceLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, color: COLORS.accent.primary },
    priceSep: { color: '#E0D4C0' },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontFamily: 'DMSans-Medium', fontSize: 12 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#9A8070' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { fontFamily: 'DMSerifDisplay-Regular', fontSize: 24, color: COLORS.text.primary, marginTop: 16 },
    emptySub: { fontFamily: 'DMSans-Regular', fontSize: 15, color: '#9A8070', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 22 },
    primaryBtn: { backgroundColor: COLORS.accent.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
    primaryBtnText: { fontFamily: 'DMSans-Medium', fontSize: 16, color: '#FFFFFF' },
});
