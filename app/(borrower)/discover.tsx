import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Platform, Linking, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LucideIcon, Zap, Hammer, Ruler, Trees, Droplets, Plug, Search, SlidersHorizontal, MapPin, Heart, ChevronRight } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { Modal } from 'react-native';

import { COLORS } from '@/constants/theme';
import ToolPin from '@/components/tool/ToolPin';
import { useNearbyTools, ToolWithDistance } from '@/hooks/useNearbyTools';
import { seedDatabase } from '@/services/seedData';
import { useAuthStore } from '@/store/authStore';
import LenderDashboardSkeleton from '@/components/skeletons/LenderDashboardSkeleton';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'All', label: 'All', icon: Search },
    { id: 'power_tools', label: 'Power Tools', icon: Zap },
    { id: 'hand_tools', label: 'Hand Tools', icon: Hammer },
    { id: 'measuring', label: 'Measuring', icon: Ruler },
    { id: 'outdoor', label: 'Outdoor', icon: Trees },
    { id: 'plumbing', label: 'Plumbing', icon: Droplets },
    { id: 'electrical', label: 'Electrical', icon: Plug },
];


export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const { setRole } = useAuthStore();
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [locationError, setLocationError] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showLenderTransition, setShowLenderTransition] = useState(false);

    const bottomSheetRef = useRef<BottomSheet>(null);
    const mapRef = useRef<any>(null);

    // Filter Logic
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]); // in cents
    const [selectedConditions, setSelectedConditions] = useState<string[]>(['excellent', 'good', 'fair']);

    // Initial center is Austin
    const centerLat = userLocation?.latitude ?? 30.2672;
    const centerLng = userLocation?.longitude ?? -97.7431;

    const { tools, isLoading } = useNearbyTools(centerLat, centerLng, 5);

    // Seed check - v4 forces re-seed with verified images and accurate retail prices
    useEffect(() => {
        const checkSeed = async () => {
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const seeded = await AsyncStorage.getItem('tooltime_seeded_v4');
                if (!seeded) {
                    await seedDatabase();
                    await AsyncStorage.setItem('tooltime_seeded_v4', 'true');
                }
            } catch (e) {
                seedDatabase();
            }
        };
        checkSeed();
    }, []);

    // Location Permission
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError(true);
                return;
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            // Use real GPS if valid, otherwise fall back to Austin
            const isValidCoords = coords.latitude !== 0 && coords.longitude !== 0;
            const finalCoords = isValidCoords ? coords : { latitude: 30.2672, longitude: -97.7431 };
            setUserLocation(finalCoords);

            mapRef.current?.animateToRegion({
                ...finalCoords,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            });
        })();
    }, []);

    // Client-side filtering
    const filteredTools = useMemo(() => {
        let result = tools;
        if (activeCategory !== 'All') {
            result = result.filter(t => t.category === activeCategory);
        }
        if (search) {
            result = result.filter(t =>
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.category.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Advanced Filters
        result = result.filter(t =>
            t.hourlyRate >= priceRange[0] &&
            t.hourlyRate <= priceRange[1] &&
            selectedConditions.includes(t.condition)
        );

        return result;
    }, [tools, activeCategory, search, priceRange, selectedConditions]);

    const selectedTool = useMemo(() =>
        tools.find(t => t.id === selectedToolId),
        [tools, selectedToolId]);

    const handleToolSelect = useCallback((toolId: string) => {
        setSelectedToolId(toolId);
        bottomSheetRef.current?.snapToIndex(0); // Show tool detail peek
    }, []);

    const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

    const handleSheetChange = useCallback((index: number) => {
        // Clear selected tool if we pull sheet up or down significantly
        if (index > 0) {
            // keep it selected
        }
    }, []);

    const toggleCondition = (cond: string) => {
        if (selectedConditions.includes(cond)) {
            setSelectedConditions(selectedConditions.filter(c => c !== cond));
        } else {
            setSelectedConditions([...selectedConditions, cond]);
        }
    };

    useEffect(() => {
        if (showLenderTransition) {
            const frame = requestAnimationFrame(() => {
                setRole('lender');
                router.replace('/(lender)/dashboard');
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [showLenderTransition]);

    if (showLenderTransition) {
        return <LenderDashboardSkeleton />;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <StatusBar style="dark" />

                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: 30.2672,
                        longitude: -97.7431,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    showsPointsOfInterest={false}
                    showsCompass={false}
                >

                    {isLoading ? (
                        // Skeleton pins (conceptual placeholder)
                        null
                    ) : (
                        filteredTools.map(tool => (
                            <ToolPin
                                key={tool.id}
                                tool={tool}
                                isSelected={selectedToolId === tool.id}
                                onPress={() => handleToolSelect(tool.id)}
                            />
                        ))
                    )}
                </MapView>

                {/* Recenter Button */}
                <TouchableOpacity
                    style={[styles.recenterBtn, { top: insets.top + 180 }]}
                    onPress={() => {
                        if (userLocation) {
                            mapRef.current?.animateToRegion({
                                ...userLocation,
                                latitudeDelta: 0.04,
                                longitudeDelta: 0.04,
                            });
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="locate" size={20} color={COLORS.accent.primary} />
                </TouchableOpacity>

                {/* Top Control Cluster with Frosted Backdrop */}
                <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={styles.overlayBacking} />

                    {/* Toggle Pill */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleSide, styles.toggleActive]}
                        >
                            <Text style={styles.toggleActiveText}>Borrow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.toggleSide}
                            onPress={() => setShowLenderTransition(true)}
                        >
                            <Text style={styles.toggleInactiveText}>Lend</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
                        <Search size={18} color="#9A8070" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a tool..."
                            placeholderTextColor="#9A8070"
                            value={search}
                            onChangeText={setSearch}
                            onFocus={() => {
                                setIsSearchFocused(true);
                                bottomSheetRef.current?.snapToIndex(1); // Expand sheet on search
                            }}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
                            <SlidersHorizontal size={20} color="#6B4226" />
                        </TouchableOpacity>
                    </View>

                    {/* Category Chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContent}
                        style={styles.categoriesScroll}
                    >
                        {CATEGORIES.map((cat) => {
                            const isActive = activeCategory === cat.id;
                            const Icon = cat.icon;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                    onPress={() => setActiveCategory(cat.id)}
                                >
                                    <Icon size={14} color={isActive ? '#FFFFFF' : '#9A8070'} />
                                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {userLocation && !isSearchFocused && (
                        <View style={styles.locationBanner}>
                            <Ionicons name="location" size={16} color="#C4622A" />
                            <Text style={styles.locationBannerText}>
                                Tools near your location
                            </Text>
                            <TouchableOpacity onPress={() => Linking.openSettings()}>
                                <Text style={styles.locationBannerLink}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>




                {/* Bottom Peek Card */}
                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={snapPoints}
                    onChange={handleSheetChange}
                    handleIndicatorStyle={{ backgroundColor: '#E0D4C0' }}
                    backgroundStyle={{ borderRadius: 24, backgroundColor: '#FFFFFF' }}
                >
                    <BottomSheetView style={styles.sheetContent}>
                        {selectedTool ? (
                            <View style={styles.selectedPeek}>
                                <View style={styles.toolMainRow}>
                                    <Image
                                        source={{ uri: selectedTool.photoUrls?.[0] || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&fit=crop' }}
                                        style={styles.toolLargeImg}
                                        contentFit="cover"
                                        transition={200}
                                    />
                                    <View style={styles.toolMainInfo}>
                                        <View style={styles.titleRow}>
                                            <Text style={styles.toolTitle} numberOfLines={1}>{selectedTool.name || 'Tool'}</Text>
                                            <TouchableOpacity onPress={() => setSelectedToolId(null)}>
                                                <Ionicons name="close-circle" size={24} color="#E0D4C0" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.ratingRow}>
                                            <Text style={styles.ratingText}>★ {(selectedTool.rating ?? 0).toFixed(1)}</Text>
                                            <Text style={styles.distanceText}> • {(selectedTool.distanceKm ?? 0).toFixed(1)} mi away</Text>
                                        </View>
                                        <Text style={styles.priceHighlight}>
                                            ${((selectedTool.hourlyRate ?? 0) / 100).toFixed(0)}<Text style={styles.priceUnit}>/hr</Text>
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.miniDesc} numberOfLines={2}>{selectedTool.description || 'No description available'}</Text>
                                <TouchableOpacity
                                    style={styles.seeToolBtn}
                                    onPress={() => router.push({
                                        pathname: '/(borrower)/tool/[toolId]',
                                        params: { toolId: selectedTool.id }
                                    })}
                                >
                                    <Text style={styles.seeToolText}>See Details & Book</Text>
                                    <ChevronRight size={18} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.listPeek}>
                                <View style={styles.peekHeader}>
                                    <Text style={styles.peekTitle}>Tools nearby</Text>
                                    <Text style={styles.peekSub}>{filteredTools.length} results</Text>
                                </View>
                                <FlatList
                                    data={filteredTools}
                                    keyExtractor={(item) => item.id}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.listToolItem}
                                            onPress={() => {
                                                handleToolSelect(item.id);
                                                mapRef.current?.animateToRegion({
                                                    latitude: item.lat,
                                                    longitude: item.lng,
                                                    latitudeDelta: 0.01,
                                                    longitudeDelta: 0.01,
                                                });
                                            }}
                                        >
                                            <Image source={{ uri: item.photoUrls?.[0] || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&fit=crop' }} style={styles.listItemImg} />
                                            <View style={styles.listItemInfo}>
                                                <Text style={styles.listItemName} numberOfLines={1}>{item.name}</Text>
                                                <Text style={styles.listItemDesc} numberOfLines={1}>{item.description}</Text>
                                                <View style={styles.listItemMeta}>
                                                    <Text style={styles.listItemPrice}>${(item.hourlyRate / 100).toFixed(0)}/hr</Text>
                                                    <Text style={styles.listItemDistance}>★ {(item.rating ?? 0).toFixed(1)} • {(item.distanceKm ?? 0).toFixed(1)} mi</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 40 }}
                                />
                            </View>
                        )}
                    </BottomSheetView>
                </BottomSheet>

                {/* Filter Modal */}
                <Modal
                    visible={isFilterModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filters</Text>
                                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#1C1410" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalContent}>
                                <Text style={styles.filterGroupTitle}>Categories</Text>
                                <View style={styles.filterGrid}>
                                    {CATEGORIES.map(cat => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.filterChip, activeCategory === cat.id && styles.filterChipActive]}
                                            onPress={() => setActiveCategory(cat.id)}
                                        >
                                            <Text style={[styles.filterChipText, activeCategory === cat.id && styles.filterChipTextActive]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.filterGroupTitle}>Price Range (per hour)</Text>
                                <View style={styles.priceFilterRow}>
                                    <TouchableOpacity
                                        style={[styles.priceTag, priceRange[1] <= 500 && styles.priceTagActive]}
                                        onPress={() => setPriceRange([0, 500])}
                                    >
                                        <Text style={[styles.priceTagText, priceRange[1] <= 500 && styles.priceTagTextActive]}>Under $5</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.priceTag, priceRange[1] > 500 && priceRange[1] <= 1000 && styles.priceTagActive]}
                                        onPress={() => setPriceRange([0, 1000])}
                                    >
                                        <Text style={[styles.priceTagText, priceRange[1] > 500 && priceRange[1] <= 1000 && styles.priceTagTextActive]}>Under $10</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.priceTag, priceRange[1] > 1000 && styles.priceTagActive]}
                                        onPress={() => setPriceRange([0, 5000])}
                                    >
                                        <Text style={[styles.priceTagText, priceRange[1] > 1000 && styles.priceTagTextActive]}>Any Price</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.filterGroupTitle}>Condition</Text>
                                <View style={styles.filterGrid}>
                                    {['excellent', 'good', 'fair'].map(cond => (
                                        <TouchableOpacity
                                            key={cond}
                                            style={[styles.filterChip, selectedConditions.includes(cond) && styles.filterChipActive]}
                                            onPress={() => toggleCondition(cond)}
                                        >
                                            <Text style={[styles.filterChipText, selectedConditions.includes(cond) && styles.filterChipTextActive]}>
                                                {cond.charAt(0).toUpperCase() + cond.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={() => setFilterModalVisible(false)}
                            >
                                <Text style={styles.applyBtnText}>Show {filteredTools.length} tools</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </GestureHandlerRootView>
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
        paddingBottom: 16,
        zIndex: 10,
    },
    overlayBacking: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(245, 240, 232, 0.85)',
    },
    toggleContainer: {
        flexDirection: 'row',
        height: 36,
        marginHorizontal: 16,
        backgroundColor: '#EDE4D4',
        borderRadius: 18,
        padding: 2,
    },
    toggleSide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: '#C4622A',
        borderRadius: 14,
    },
    toggleActiveText: {
        color: '#FFFFFF',
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
    },
    toggleInactiveText: {
        color: '#9A8070',
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        height: 48,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    searchBarFocused: {
        borderColor: '#C4622A',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: '#1C1410',
    },
    categoriesScroll: {
        marginTop: 8,
    },
    categoriesContent: {
        paddingLeft: 20,
        paddingRight: 8,
        gap: 8,
        flexDirection: 'row',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0D4C0',
        gap: 6,
    },
    categoryChipActive: {
        backgroundColor: '#C4622A',
        borderColor: '#C4622A',
    },
    categoryLabel: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: '#9A8070',
    },
    categoryLabelActive: {
        color: '#FFFFFF',
    },
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E0D4C0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 1,
    },
    locationBannerText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#1C1410',
        flex: 1,
        marginLeft: 8,
    },
    locationBannerLink: {
        color: '#C4622A',
        fontFamily: 'DMSans-Bold',
        fontSize: 13,
    },
    sheetContent: {
        padding: 16,
        flex: 1,
    },
    listPeek: {
        flex: 1,
    },
    peekHeader: {
        marginBottom: 16,
    },
    peekTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: '#1C1410',
    },
    peekSub: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: '#9A8070',
        marginTop: 2,
    },
    listToolItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
        gap: 12,
    },
    listItemImg: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: '#F5F0E8',
    },
    listItemInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    listItemName: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: '#1C1410',
    },
    listItemDesc: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
        marginTop: 2,
    },
    listItemMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    listItemPrice: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 13,
        color: '#C4622A',
    },
    listItemDistance: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 11,
        color: '#9A8070',
    },
    selectedPeek: {
        gap: 12,
    },
    toolMainRow: {
        flexDirection: 'row',
        gap: 16,
    },
    toolLargeImg: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
    },
    toolMainInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toolTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 17,
        color: '#1C1410',
        flex: 1,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ratingText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 12,
        color: '#1C1410',
    },
    distanceText: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 12,
        color: '#9A8070',
    },
    priceHighlight: {
        marginTop: 6,
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 15,
        color: '#C4622A',
    },
    priceUnit: {
        fontSize: 12,
        fontFamily: 'JetBrainsMono-Regular',
    },
    miniDesc: {
        fontFamily: 'DMSans-Regular',
        fontSize: 14,
        color: '#6B4226',
        lineHeight: 20,
    },
    seeToolBtn: {
        backgroundColor: '#C4622A',
        height: 52,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    seeToolText: {
        color: '#FFFFFF',
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(28, 20, 16, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontFamily: 'DMSerifDisplay-Regular',
        fontSize: 24,
        color: '#1C1410',
    },
    modalContent: {
        marginBottom: 24,
    },
    filterGroupTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#1C1410',
        marginBottom: 12,
        marginTop: 8,
    },
    filterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    filterChipActive: {
        backgroundColor: '#C4622A',
        borderColor: '#C4622A',
    },
    filterChipText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#6B4226',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },
    priceFilterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    priceTag: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    priceTagActive: {
        backgroundColor: '#C4622A',
        borderColor: '#C4622A',
    },
    priceTagText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#6B4226',
    },
    priceTagTextActive: {
        color: '#FFFFFF',
    },
    applyBtn: {
        backgroundColor: '#C4622A',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
    },
    recenterBtn: {
        position: 'absolute',
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 6,
    },
    searchResultsOverlay: {
        position: 'absolute',
        top: 160,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F5F0E8',
        zIndex: 5,
    },
});
