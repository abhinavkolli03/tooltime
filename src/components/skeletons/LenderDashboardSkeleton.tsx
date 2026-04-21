import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox } from '../ui/SkeletonLoader';

export default function LenderDashboardSkeleton() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Toggle */}
            <View style={styles.toggleContainer}>
                <SkeletonBox width="100%" height={36} borderRadius={18} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <SkeletonBox width={48} height={48} borderRadius={24} />
                        <View style={{ marginLeft: 12 }}>
                            <SkeletonBox width={100} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                            <SkeletonBox width={80} height={20} borderRadius={6} />
                        </View>
                    </View>
                    <SkeletonBox width={44} height={44} borderRadius={22} />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.statCard}>
                            <SkeletonBox width={80} height={10} borderRadius={4} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={40} height={24} borderRadius={6} />
                        </View>
                    ))}
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeader}>
                    <SkeletonBox width={150} height={22} borderRadius={8} />
                    <SkeletonBox width={60} height={16} borderRadius={6} />
                </View>

                {/* Request Cards */}
                {[1, 2].map((i) => (
                    <View key={i} style={styles.requestCard}>
                        <View style={styles.reqHeader}>
                            <SkeletonBox width={44} height={44} borderRadius={22} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <SkeletonBox width="60%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
                                <SkeletonBox width="40%" height={14} borderRadius={6} />
                            </View>
                            <SkeletonBox width={50} height={24} borderRadius={6} />
                        </View>
                        <View style={styles.reqActions}>
                            <SkeletonBox width="48%" height={40} borderRadius={12} />
                            <SkeletonBox width="48%" height={40} borderRadius={12} />
                        </View>
                    </View>
                ))}

                {/* Listings Section */}
                <View style={styles.sectionHeader}>
                    <SkeletonBox width={120} height={22} borderRadius={8} />
                    <SkeletonBox width={80} height={16} borderRadius={6} />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, gap: 16 }}>
                    {[1, 2, 3].map((i) => (
                        <View key={i}>
                            <SkeletonBox width={160} height={130} borderRadius={16} style={{ marginBottom: 8 }} />
                            <SkeletonBox width={120} height={14} borderRadius={6} style={{ marginBottom: 4 }} />
                            <SkeletonBox width={80} height={14} borderRadius={6} />
                        </View>
                    ))}
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    toggleContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F5F0E8',
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
        marginTop: 8,
    },
    requestCard: {
        marginHorizontal: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F5F0E8',
    },
    reqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    reqActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
});
