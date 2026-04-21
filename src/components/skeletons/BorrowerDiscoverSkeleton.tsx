import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox } from '../ui/SkeletonLoader';

const { width } = Dimensions.get('window');

export default function BorrowerDiscoverSkeleton() {
    return (
        <View style={styles.container}>
            {/* Map placeholder */}
            <View style={styles.map}>
                <SkeletonBox width="100%" height="100%" borderRadius={0} />
            </View>

            {/* Header skeleton */}
            <SafeAreaView edges={['top']} style={styles.headerContainer}>
                <View style={styles.header}>
                    {/* Toggle */}
                    <SkeletonBox width={width - 32} height={36} borderRadius={18} style={{ marginBottom: 12 }} />
                    {/* Search */}
                    <SkeletonBox width={width - 40} height={48} borderRadius={12} style={{ marginBottom: 8 }} />
                    {/* Categories */}
                    <View style={styles.categoriesRow}>
                        <SkeletonBox width={100} height={36} borderRadius={10} />
                        <SkeletonBox width={120} height={36} borderRadius={10} />
                        <SkeletonBox width={90} height={36} borderRadius={10} />
                    </View>
                </View>
            </SafeAreaView>

            {/* Bottom sheet peek */}
            <View style={styles.bottomPeek}>
                <SkeletonBox width={40} height={4} borderRadius={2} style={{ alignSelf: 'center', marginBottom: 16 }} />
                <SkeletonBox width={150} height={22} borderRadius={8} style={{ marginBottom: 8 }} />
                <SkeletonBox width={100} height={16} borderRadius={6} style={{ marginBottom: 20 }} />

                {/* Tool list items */}
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.listItem}>
                        <SkeletonBox width={64} height={64} borderRadius={8} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <SkeletonBox width="80%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
                            <SkeletonBox width="60%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                            <SkeletonBox width="40%" height={14} borderRadius={6} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(245, 240, 232, 0.95)',
        paddingBottom: 16,
    },
    header: {
        paddingHorizontal: 16,
    },
    categoriesRow: {
        flexDirection: 'row',
        gap: 8,
        paddingLeft: 4,
    },
    bottomPeek: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        height: 350,
    },
    listItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
});
