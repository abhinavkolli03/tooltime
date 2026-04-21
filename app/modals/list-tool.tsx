import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
    Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { geohashForLocation } from 'geofire-common';
import { COLORS } from '@/constants/theme';
import { clientCreateListing } from '@/services/bookingService';
import { analyzeToolImage, AIToolAnalysis } from '@/services/aiVisionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'power_tools', label: 'Power Tools', icon: 'flash' },
    { id: 'hand_tools', label: 'Hand Tools', icon: 'hammer' },
    { id: 'measuring', label: 'Measuring', icon: 'resize' },
    { id: 'outdoor', label: 'Outdoor', icon: 'leaf' },
    { id: 'plumbing', label: 'Plumbing', icon: 'water' },
    { id: 'electrical', label: 'Electrical', icon: 'flash-outline' },
];

const CONDITIONS = [
    { id: 'excellent', label: 'Excellent', desc: 'Like new' },
    { id: 'good', label: 'Good', desc: 'Well maintained' },
    { id: 'fair', label: 'Fair', desc: 'Shows wear' },
];

type AnalysisState = 'idle' | 'analyzing' | 'success' | 'error';

export default function ListToolModal() {
    const router = useRouter();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [aiResult, setAiResult] = useState<AIToolAnalysis | null>(null);
    const [aiConfidence, setAiConfidence] = useState<number>(0);

    const [toolName, setToolName] = useState('');
    const [category, setCategory] = useState('power_tools');
    const [condition, setCondition] = useState('good');
    const [description, setDescription] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [dailyRate, setDailyRate] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [marketRetailPrice, setMarketRetailPrice] = useState('');
    const [specs, setSpecs] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [priceBounds, setPriceBounds] = useState<{
        minHourly: number; maxHourly: number;
        minDaily: number; maxDaily: number;
    } | null>(null);

    const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

    const pulseAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (analysisState === 'analyzing') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
                ])
            );
            const shimmer = Animated.loop(
                Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            );
            pulse.start();
            shimmer.start();
            return () => { pulse.stop(); shimmer.stop(); };
        }
    }, [analysisState]);

    useEffect(() => {
        if (analysisState === 'success') {
            Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        } else {
            successScale.setValue(0);
        }
    }, [analysisState]);

    const pickImage = async (source: 'camera' | 'gallery') => {
        try {
            let result: ImagePicker.ImagePickerResult;
            const options: ImagePicker.ImagePickerOptions = {
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                base64: true,
            };

            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Needed', 'Camera access is required to take photos.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Needed', 'Photo library access is required.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setImageUri(asset.uri);
                setImageBase64(asset.base64 ?? null);
                setAnalysisState('idle');
                setAiResult(null);
                setAutoFilledFields(new Set());

                if (asset.base64) {
                    runAnalysis(asset.base64);
                }
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Could not access images. Please try again.');
        }
    };

    const runAnalysis = async (base64: string) => {
        setAnalysisState('analyzing');
        try {
            const result = await analyzeToolImage(base64);
            setAiResult(result);
            setAiConfidence(result.confidence);
            applyAIResults(result);
            setAnalysisState('success');
        } catch (error: any) {
            console.error('AI analysis error:', error);
            setAnalysisState('error');
            Alert.alert(
                'Analysis Failed',
                error.message || 'Could not identify the tool. You can fill in details manually.',
                [{ text: 'OK' }]
            );
        }
    };

    const applyAIResults = (result: AIToolAnalysis) => {
        const filled = new Set<string>();

        setToolName(result.name);
        filled.add('toolName');

        setDescription(result.description);
        filled.add('description');

        setCategory(result.category);
        filled.add('category');

        setCondition(result.condition);
        filled.add('condition');

        setHourlyRate(result.suggestedHourlyRate.toFixed(2));
        filled.add('hourlyRate');

        setDailyRate(result.suggestedDailyRate.toFixed(2));
        filled.add('dailyRate');

        setDepositAmount(result.suggestedDeposit.toFixed(2));
        filled.add('depositAmount');

        setMarketRetailPrice(result.estimatedRetailPrice.toFixed(2));
        filled.add('marketRetailPrice');

        setSpecs(result.specs);
        filled.add('specs');

        setPriceBounds({
            minHourly: result.minHourlyRate,
            maxHourly: result.maxHourlyRate,
            minDaily: result.minDailyRate,
            maxDaily: result.maxDailyRate,
        });

        setAutoFilledFields(filled);
    };

    const clampPrice = (
        value: string,
        setter: (v: string) => void,
        min: number,
        max: number,
        label: string,
    ) => {
        const num = parseFloat(value);
        if (isNaN(num)) { setter(value); return; }
        if (num < min) {
            Alert.alert('Price Too Low', `${label} minimum is $${min.toFixed(2)}`);
            setter(min.toFixed(2));
        } else if (num > max) {
            Alert.alert('Price Too High', `${label} maximum is $${max.toFixed(2)}`);
            setter(max.toFixed(2));
        } else {
            setter(value);
        }
    };

    const handleSubmit = async () => {
        if (!toolName.trim()) {
            Alert.alert('Tool Name Required', 'Please enter a name for your tool.');
            return;
        }
        if (!hourlyRate || !dailyRate) {
            Alert.alert('Pricing Required', 'Please set both hourly and daily rates.');
            return;
        }
        if (!depositAmount) {
            Alert.alert('Deposit Required', 'Please set a security deposit amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            let location = { latitude: 30.2672, longitude: -97.7431 };
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                }
            } catch (e) {
                console.log('Location permission denied, using default');
            }

            await clientCreateListing({
                name: toolName,
                category,
                condition,
                description: description || `${toolName} available for rent.`,
                hourlyRate: Math.round(parseFloat(hourlyRate) * 100),
                dailyRate: Math.round(parseFloat(dailyRate) * 100),
                depositAmount: Math.round(parseFloat(depositAmount) * 100),
                marketRetailPrice: marketRetailPrice
                    ? Math.round(parseFloat(marketRetailPrice) * 100)
                    : Math.round(parseFloat(hourlyRate) * 100 * 30),
                deliveryFee: 800,
                lat: location.latitude,
                lng: location.longitude,
                geohash: geohashForLocation([location.latitude, location.longitude]),
                photoUrls: imageUri
                    ? [imageUri]
                    : ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800'],
                rating: 5.0,
                rentalCount: 0,
                specs,
                aiAnalyzed: !!aiResult,
                aiConfidence: aiResult?.confidence ?? null,
            });

            Alert.alert('Success!', 'Your tool has been listed.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error listing tool:', error);
            Alert.alert('Error', 'Could not list your tool. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderImageSection = () => (
        <View style={styles.section}>
            <Text style={styles.label}>Tool Photo</Text>
            {!imageUri ? (
                <View style={styles.imagePickerContainer}>
                    <View style={styles.imagePickerPlaceholder}>
                        <Ionicons name="camera-outline" size={48} color={COLORS.text.muted} />
                        <Text style={styles.imagePickerTitle}>Snap a photo for AI magic</Text>
                        <Text style={styles.imagePickerSubtitle}>
                            AI will identify your tool and auto-fill everything
                        </Text>
                    </View>
                    <View style={styles.imagePickerButtons}>
                        <TouchableOpacity
                            style={styles.imagePickerBtn}
                            onPress={() => pickImage('camera')}
                        >
                            <Ionicons name="camera" size={22} color="#FFFFFF" />
                            <Text style={styles.imagePickerBtnText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.imagePickerBtn, styles.imagePickerBtnSecondary]}
                            onPress={() => pickImage('gallery')}
                        >
                            <Ionicons name="images" size={22} color={COLORS.accent.primary} />
                            <Text style={[styles.imagePickerBtnText, styles.imagePickerBtnTextSecondary]}>
                                Gallery
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />

                    {analysisState === 'analyzing' && (
                        <Animated.View style={[styles.analysisOverlay, {
                            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                        }]}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.analysisText}>AI is analyzing your tool...</Text>
                            <Animated.View style={[styles.shimmerBar, {
                                transform: [{
                                    translateX: shimmerAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
                                    }),
                                }],
                            }]} />
                        </Animated.View>
                    )}

                    {analysisState === 'success' && aiResult && (
                        <Animated.View style={[styles.successBadge, {
                            transform: [{ scale: successScale }],
                        }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.successBadgeText}>
                                {Math.round(aiResult.confidence * 100)}% confident
                            </Text>
                        </Animated.View>
                    )}

                    {analysisState === 'error' && (
                        <View style={styles.errorBadge}>
                            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.errorBadgeText}>Analysis failed</Text>
                        </View>
                    )}

                    <View style={styles.imageActions}>
                        <TouchableOpacity
                            style={styles.imageActionBtn}
                            onPress={() => pickImage('camera')}
                        >
                            <Ionicons name="camera" size={18} color="#FFFFFF" />
                            <Text style={styles.imageActionText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.imageActionBtn}
                            onPress={() => pickImage('gallery')}
                        >
                            <Ionicons name="images" size={18} color="#FFFFFF" />
                            <Text style={styles.imageActionText}>Gallery</Text>
                        </TouchableOpacity>
                        {(analysisState === 'error' || analysisState === 'idle') && imageBase64 && (
                            <TouchableOpacity
                                style={[styles.imageActionBtn, styles.retryBtn]}
                                onPress={() => runAnalysis(imageBase64)}
                            >
                                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                                <Text style={styles.imageActionText}>Analyze</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </View>
    );

    const renderAIBanner = () => {
        if (analysisState !== 'success' || !aiResult) return null;
        return (
            <View style={styles.aiBanner}>
                <View style={styles.aiBannerIcon}>
                    <Ionicons name="sparkles" size={20} color={COLORS.accent.primary} />
                </View>
                <View style={styles.aiBannerContent}>
                    <Text style={styles.aiBannerTitle}>AI Auto-Filled</Text>
                    <Text style={styles.aiBannerSubtitle}>
                        Review and adjust the details below. Fields highlighted in orange were set by AI.
                    </Text>
                </View>
            </View>
        );
    };

    const fieldHighlight = (field: string) =>
        autoFilledFields.has(field) ? styles.autoFilledBorder : undefined;

    const renderPriceWithBounds = (
        label: string,
        value: string,
        setter: (v: string) => void,
        unit: string,
        min?: number,
        max?: number,
        fieldKey?: string,
    ) => (
        <View style={styles.priceInput}>
            <Text style={styles.priceLabel}>{label}</Text>
            <View style={[styles.priceInputRow, fieldKey ? fieldHighlight(fieldKey) : undefined]}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                    style={styles.priceField}
                    placeholder="0.00"
                    placeholderTextColor="#9A8070"
                    value={value}
                    onChangeText={setter}
                    onBlur={() => {
                        if (min !== undefined && max !== undefined && value) {
                            clampPrice(value, setter, min, max, label);
                        }
                    }}
                    keyboardType="decimal-pad"
                />
                {unit ? <Text style={styles.priceUnit}>{unit}</Text> : null}
            </View>
            {min !== undefined && max !== undefined && (
                <Text style={styles.priceBoundsText}>
                    ${min.toFixed(2)} — ${max.toFixed(2)} suggested
                </Text>
            )}
        </View>
    );

    const renderSpecsSection = () => {
        if (specs.length === 0) return null;
        return (
            <View style={styles.section}>
                <Text style={styles.label}>
                    <Ionicons name="sparkles" size={14} color={COLORS.accent.primary} />{' '}
                    AI-Detected Specs
                </Text>
                <View style={styles.specsList}>
                    {specs.map((spec, idx) => (
                        <View key={idx} style={styles.specChip}>
                            <Text style={styles.specChipText}>{spec}</Text>
                            <TouchableOpacity onPress={() => setSpecs(s => s.filter((_, i) => i !== idx))}>
                                <Ionicons name="close-circle" size={16} color={COLORS.text.muted} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>List a Tool</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {renderImageSection()}
                    {renderAIBanner()}

                    {/* Tool Name */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Tool Name *</Text>
                        <TextInput
                            style={[styles.input, fieldHighlight('toolName')]}
                            placeholder="e.g., DeWalt 20V Cordless Drill"
                            placeholderTextColor="#9A8070"
                            value={toolName}
                            onChangeText={(v) => {
                                setToolName(v);
                                setAutoFilledFields(f => { const n = new Set(f); n.delete('toolName'); return n; });
                            }}
                            maxLength={60}
                        />
                    </View>

                    {/* Category */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Category *</Text>
                        <View style={styles.categoriesGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        category === cat.id && styles.categoryChipActive,
                                        category === cat.id && autoFilledFields.has('category') && styles.autoFilledChip,
                                    ]}
                                    onPress={() => {
                                        setCategory(cat.id);
                                        setAutoFilledFields(f => { const n = new Set(f); n.delete('category'); return n; });
                                    }}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={18}
                                        color={category === cat.id ? '#FFFFFF' : COLORS.text.primary}
                                    />
                                    <Text style={[styles.categoryChipText, category === cat.id && styles.categoryChipTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Condition */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Condition *</Text>
                        <View style={styles.conditionsRow}>
                            {CONDITIONS.map((cond) => (
                                <TouchableOpacity
                                    key={cond.id}
                                    style={[
                                        styles.conditionCard,
                                        condition === cond.id && styles.conditionCardActive,
                                        condition === cond.id && autoFilledFields.has('condition') && styles.autoFilledCondition,
                                    ]}
                                    onPress={() => {
                                        setCondition(cond.id);
                                        setAutoFilledFields(f => { const n = new Set(f); n.delete('condition'); return n; });
                                    }}
                                >
                                    <Text style={[styles.conditionLabel, condition === cond.id && styles.conditionLabelActive]}>
                                        {cond.label}
                                    </Text>
                                    <Text style={[styles.conditionDesc, condition === cond.id && styles.conditionDescActive]}>
                                        {cond.desc}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Description (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, fieldHighlight('description')]}
                            placeholder="Describe the tool, its features, and what makes it great..."
                            placeholderTextColor="#9A8070"
                            value={description}
                            onChangeText={(v) => {
                                setDescription(v);
                                setAutoFilledFields(f => { const n = new Set(f); n.delete('description'); return n; });
                            }}
                            multiline
                            numberOfLines={4}
                            maxLength={300}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{description.length}/300</Text>
                    </View>

                    {renderSpecsSection()}

                    {/* Pricing */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Pricing *</Text>
                        <View style={styles.priceRow}>
                            {renderPriceWithBounds(
                                'Hourly Rate', hourlyRate,
                                (v) => {
                                    setHourlyRate(v);
                                    setAutoFilledFields(f => { const n = new Set(f); n.delete('hourlyRate'); return n; });
                                },
                                '/hr',
                                priceBounds?.minHourly, priceBounds?.maxHourly,
                                'hourlyRate',
                            )}
                            {renderPriceWithBounds(
                                'Daily Rate', dailyRate,
                                (v) => {
                                    setDailyRate(v);
                                    setAutoFilledFields(f => { const n = new Set(f); n.delete('dailyRate'); return n; });
                                },
                                '/day',
                                priceBounds?.minDaily, priceBounds?.maxDaily,
                                'dailyRate',
                            )}
                        </View>
                    </View>

                    {/* Deposit & Retail */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Security & Value</Text>
                        <View style={styles.priceRow}>
                            <View style={styles.priceInput}>
                                <Text style={styles.priceLabel}>Security Deposit *</Text>
                                <View style={[styles.priceInputRow, fieldHighlight('depositAmount')]}>
                                    <Text style={styles.dollarSign}>$</Text>
                                    <TextInput
                                        style={styles.priceField}
                                        placeholder="50.00"
                                        placeholderTextColor="#9A8070"
                                        value={depositAmount}
                                        onChangeText={(v) => {
                                            setDepositAmount(v);
                                            setAutoFilledFields(f => { const n = new Set(f); n.delete('depositAmount'); return n; });
                                        }}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <Text style={styles.helperText}>Held, fully refundable</Text>
                            </View>
                            <View style={styles.priceInput}>
                                <Text style={styles.priceLabel}>Retail Price</Text>
                                <View style={[styles.priceInputRow, fieldHighlight('marketRetailPrice')]}>
                                    <Text style={styles.dollarSign}>$</Text>
                                    <TextInput
                                        style={styles.priceField}
                                        placeholder="200.00"
                                        placeholderTextColor="#9A8070"
                                        value={marketRetailPrice}
                                        onChangeText={(v) => {
                                            setMarketRetailPrice(v);
                                            setAutoFilledFields(f => { const n = new Set(f); n.delete('marketRetailPrice'); return n; });
                                        }}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <Text style={styles.helperText}>Shows savings to renters</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Bar */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                                <Text style={styles.submitBtnText}>List My Tool</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0E8',
    },
    closeBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 120,
    },
    section: {
        marginBottom: 28,
    },
    label: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: COLORS.text.primary,
        marginBottom: 10,
    },

    // --- Image Picker ---
    imagePickerContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#E0D4C0',
        borderStyle: 'dashed',
    },
    imagePickerPlaceholder: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
        backgroundColor: '#FDFBF7',
    },
    imagePickerTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: COLORS.text.primary,
        marginTop: 12,
    },
    imagePickerSubtitle: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: COLORS.text.muted,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 18,
    },
    imagePickerButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E0D4C0',
    },
    imagePickerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        backgroundColor: COLORS.accent.primary,
    },
    imagePickerBtnSecondary: {
        backgroundColor: '#FDFBF7',
        borderLeftWidth: 1,
        borderLeftColor: '#E0D4C0',
    },
    imagePickerBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: '#FFFFFF',
    },
    imagePickerBtnTextSecondary: {
        color: COLORS.accent.primary,
    },

    // --- Image Preview ---
    imagePreviewContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1C1410',
    },
    imagePreview: {
        width: '100%',
        height: 220,
        resizeMode: 'cover',
    },
    analysisOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28, 20, 16, 0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    analysisText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 15,
        color: '#FFFFFF',
        marginTop: 12,
    },
    shimmerBar: {
        position: 'absolute',
        bottom: 0,
        width: 120,
        height: 3,
        backgroundColor: COLORS.accent.primary,
        borderRadius: 2,
    },
    successBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.semantic.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    successBadgeText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        color: '#FFFFFF',
    },
    errorBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.semantic.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    errorBadgeText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        color: '#FFFFFF',
    },
    imageActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(28, 20, 16, 0.9)',
    },
    imageActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    imageActionText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 12,
        color: '#FFFFFF',
    },
    retryBtn: {
        backgroundColor: COLORS.accent.primary,
    },

    // --- AI Banner ---
    aiBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5ED',
        borderRadius: 12,
        padding: 14,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#F5D4B8',
        gap: 12,
    },
    aiBannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF0E4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiBannerContent: {
        flex: 1,
    },
    aiBannerTitle: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.accent.primary,
    },
    aiBannerSubtitle: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: COLORS.text.muted,
        marginTop: 2,
        lineHeight: 16,
    },

    // --- Auto-fill highlight ---
    autoFilledBorder: {
        borderColor: COLORS.accent.primary,
        borderWidth: 1.5,
    },
    autoFilledChip: {
        borderColor: COLORS.accent.primary,
        borderWidth: 2,
    },
    autoFilledCondition: {
        borderColor: COLORS.accent.primary,
        borderWidth: 2,
    },

    // --- Specs ---
    specsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    specChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF5ED',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F5D4B8',
    },
    specChipText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: COLORS.text.primary,
    },

    // --- Price bounds ---
    priceBoundsText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 11,
        color: COLORS.accent.primary,
        marginTop: 4,
    },

    // --- Existing styles ---
    input: {
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        padding: 16,
        fontFamily: 'DMSans-Regular',
        fontSize: 15,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    textArea: {
        height: 100,
    },
    charCount: {
        fontFamily: 'DMSans-Regular',
        fontSize: 12,
        color: '#9A8070',
        textAlign: 'right',
        marginTop: 4,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F5F0E8',
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    categoryChipActive: {
        backgroundColor: COLORS.accent.primary,
        borderColor: COLORS.accent.primary,
    },
    categoryChipText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: COLORS.text.primary,
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
    },
    conditionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    conditionCard: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E0D4C0',
        alignItems: 'center',
    },
    conditionCardActive: {
        backgroundColor: '#E8F5E2',
        borderColor: '#5A7A4A',
        borderWidth: 2,
    },
    conditionLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 14,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    conditionLabelActive: {
        color: '#5A7A4A',
    },
    conditionDesc: {
        fontFamily: 'DMSans-Regular',
        fontSize: 11,
        color: '#9A8070',
    },
    conditionDescActive: {
        color: '#5A7A4A',
    },
    priceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priceInput: {
        flex: 1,
    },
    priceLabel: {
        fontFamily: 'DMSans-Medium',
        fontSize: 13,
        color: '#9A8070',
        marginBottom: 8,
    },
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E0D4C0',
    },
    dollarSign: {
        fontFamily: 'DMSans-Medium',
        fontSize: 18,
        color: COLORS.text.primary,
        marginRight: 4,
    },
    priceField: {
        flex: 1,
        fontFamily: 'DMSans-Regular',
        fontSize: 16,
        color: COLORS.text.primary,
        padding: 0,
    },
    priceUnit: {
        fontFamily: 'DMSans-Regular',
        fontSize: 13,
        color: '#9A8070',
    },
    helperText: {
        fontFamily: 'DMSans-Regular',
        fontSize: 11,
        color: '#9A8070',
        marginTop: 4,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#F5F0E8',
        backgroundColor: '#FFFFFF',
    },
    submitBtn: {
        backgroundColor: COLORS.accent.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        fontFamily: 'DMSans-Medium',
        fontSize: 16,
        color: '#FFFFFF',
    },
});
