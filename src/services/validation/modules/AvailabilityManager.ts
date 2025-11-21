/**
 * Availability Management Module
 * 
 * Handles component availability ratings, cost analysis, and procurement assessment.
 * Extracted from TechLevelRulesValidator.ts for better modularity and testability.
 */

import { 
  AvailabilityValidation,
  ComponentAvailability,
  AvailabilityBreakdown,
  AvailabilityViolation,
  ComponentInfo,
  TechLevelValidationContext
} from '../types/TechLevelTypes';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

export class AvailabilityManager {
  // Availability rating definitions
  private static readonly AVAILABILITY_RATINGS = {
    'A': { name: 'Very Common', cost: 1.0, description: 'Readily available everywhere' },
    'B': { name: 'Common', cost: 1.2, description: 'Available in most locations' },
    'C': { name: 'Uncommon', cost: 1.5, description: 'Available in major centers' },
    'D': { name: 'Rare', cost: 2.0, description: 'Difficult to find' },
    'E': { name: 'Very Rare', cost: 3.0, description: 'Extremely difficult to obtain' },
    'F': { name: 'Extinct', cost: 5.0, description: 'Lost technology' },
    'X': { name: 'Unique', cost: 10.0, description: 'One-of-a-kind or experimental' }
  };

  /**
   * Validate availability ratings for all components
   */
  static validateAvailabilityRating(
    components: ComponentInfo[], 
    config: UnitConfiguration,
    context: TechLevelValidationContext
  ): AvailabilityValidation {
    const violations: AvailabilityViolation[] = [];
    const componentRatings: ComponentAvailability[] = [];
    
    const targetRating = context.targetAvailabilityRating;
    
    for (const component of components) {
      const availability = this.getComponentAvailability(component, config);
      componentRatings.push(availability);
      
      if (this.isRatingWorse(availability.rating, targetRating)) {
        violations.push({
          component: component.name,
          rating: availability.rating,
          requiredRating: targetRating,
          message: `${component.name} availability rating ${availability.rating} exceeds target ${targetRating}`,
          severity: this.getAvailabilitySeverity(availability.rating, targetRating),
          impact: `Increases unit rarity and procurement difficulty`
        });
      }
    }
    
    const ratingBreakdown = this.calculateAvailabilityBreakdown(componentRatings, targetRating);
    const overallRating = this.calculateOverallAvailabilityRating(componentRatings);
    
    return {
      isValid: violations.length === 0,
      overallRating,
      componentRatings,
      ratingBreakdown,
      violations
    };
  }

  /**
   * Get availability ratings definitions
   */
  static getAvailabilityRatings() {
    return { ...this.AVAILABILITY_RATINGS };
  }

  /**
   * Get component availability rating
   */
  static getComponentAvailability(component: ComponentInfo, config: UnitConfiguration): ComponentAvailability {
    const unitTechBase = config.techBase || 'Inner Sphere';
    
    // Start with default availability
    let rating = 'C'; // Default to uncommon
    let cost = 1.5;
    let rarity = 'Uncommon';
    
    // Basic components are more common
    if (component.category === 'structure' && component.name.includes('Standard')) {
      rating = 'A';
      cost = 1.0;
      rarity = 'Very Common';
    }
    
    // Advanced components are rarer
    if (component.name.includes('Double') || component.name.includes('Endo') || 
        component.name.includes('Ferro') || component.name.includes('XL')) {
      rating = 'D';
      cost = 2.0;
      rarity = 'Rare';
    }
    
    // Clan components are always very rare (E rating) regardless of unit tech base
    // This reflects their rarity in the Inner Sphere and even in Clan space
    if (component.techBase === 'Clan') {
      rating = 'E';
      cost = 3.0;
      rarity = 'Very Rare';
    } else if (component.techBase === 'Inner Sphere' && unitTechBase === 'Clan') {
      // Inner Sphere components on Clan units are rare (salvage/captured)
      rating = rating === 'A' ? 'C' : (rating === 'C' ? 'D' : rating);
      cost = cost * 1.5;
      rarity = rating === 'D' ? 'Rare' : 'Uncommon';
    }
    
    return {
      component: component.name,
      rating,
      available: true,
      techBase: component.techBase,
      era: 'Succession Wars', // Would be dynamic in real implementation
      rarity,
      cost,
      notes: `${rarity} availability in current era`
    };
  }

  /**
   * Check if rating is worse than target
   */
  static isRatingWorse(rating: string, targetRating: string): boolean {
    const ratingOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'X'];
    const ratingIndex = ratingOrder.indexOf(rating);
    const targetIndex = ratingOrder.indexOf(targetRating);
    
    // Handle invalid target ratings gracefully
    if (targetIndex === -1) {
      return false; // If target rating is invalid, don't flag as violation
    }
    
    return ratingIndex > targetIndex;
  }

  /**
   * Get availability violation severity
   */
  static getAvailabilitySeverity(rating: string, targetRating: string): 'critical' | 'major' | 'minor' {
    const ratingOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'X'];
    const ratingIndex = ratingOrder.indexOf(rating);
    const targetIndex = ratingOrder.indexOf(targetRating);
    
    const difference = ratingIndex - targetIndex;
    
    if (difference > 2) return 'critical';
    if (difference > 1) return 'major';
    return 'minor';
  }

  /**
   * Calculate availability breakdown
   */
  static calculateAvailabilityBreakdown(ratings: ComponentAvailability[], targetRating: string): AvailabilityBreakdown {
    const totalComponents = ratings.length;
    const ratingDistribution: { [rating: string]: number } = {};
    
    // Count rating distribution
    ratings.forEach(r => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });
    
    // Calculate average rating
    const ratingOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'X'];
    const averageRating = ratings.reduce((sum, r) => sum + ratingOrder.indexOf(r.rating), 0) / totalComponents;
    
    const limitingFactors = ratings.filter(r => this.isRatingWorse(r.rating, targetRating))
      .map(r => r.component);
    
    const improvementSuggestions = [
      'Replace rare components with more common alternatives',
      'Consider different tech base for better availability',
      'Adjust era settings to match component availability'
    ];
    
    return {
      totalComponents,
      ratingDistribution,
      averageRating,
      limitingFactors,
      improvementSuggestions
    };
  }

  /**
   * Calculate overall availability rating (worst component rating)
   */
  static calculateOverallAvailabilityRating(ratings: ComponentAvailability[]): string {
    if (ratings.length === 0) return 'A';
    
    // Use the worst rating as the overall rating
    const ratingOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'X'];
    let worstIndex = 0;
    
    ratings.forEach(r => {
      const index = ratingOrder.indexOf(r.rating);
      if (index > worstIndex) {
        worstIndex = index;
      }
    });
    
    return ratingOrder[worstIndex];
  }

  /**
   * Calculate average availability score
   */
  static calculateAverageAvailabilityScore(ratings: ComponentAvailability[]): number {
    if (ratings.length === 0) return 0;
    
    const ratingOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'X'];
    const totalScore = ratings.reduce((sum, r) => sum + ratingOrder.indexOf(r.rating), 0);
    
    return totalScore / ratings.length;
  }

  /**
   * Get cost multiplier for availability rating
   */
  static getCostMultiplier(rating: string): number {
    const ratingInfo = this.AVAILABILITY_RATINGS[rating as keyof typeof this.AVAILABILITY_RATINGS];
    return ratingInfo?.cost || 1.0;
  }

  /**
   * Get rating description
   */
  static getRatingDescription(rating: string): string {
    const ratingInfo = this.AVAILABILITY_RATINGS[rating as keyof typeof this.AVAILABILITY_RATINGS];
    return ratingInfo?.description || 'Unknown rating';
  }

  /**
   * Get all available ratings in order
   */
  static getAvailableRatings(): string[] {
    return Object.keys(this.AVAILABILITY_RATINGS);
  }

  /**
   * Validate if rating is valid
   */
  static isValidRating(rating: string): boolean {
    return this.getAvailableRatings().includes(rating);
  }
}




