"""Integer-paise scenario pricing and same-airport, separate-ticket connections."""

def price_offer(observation, policy, adults=1, children=0, infants=0):
    for value in (adults, children, infants):
        if type(value) is not int or value < 0:
            raise ValueError('Passenger counts must be non-negative integers')
    if adults < 1 or adults+children > 9 or infants > adults:
        raise ValueError('Require an adult; maximum nine seated passengers and one lap infant per adult')
    if observation['cabin'] != policy['cabin']:
        raise ValueError('Policy does not match cabin')
    if observation['airline'] != policy['airline']:
        raise ValueError('Policy does not match airline')
    if observation['outcome'] != 'AVAILABLE' or observation['cabin_bookable_seats'] < adults+children:
        return None
    # Explicit scenario rounding, once for each passenger type; never binary floats.
    base = (observation['base_paise']*observation['price_multiplier_bp']+5000)//10000
    adult_base=(base*policy['adult_multiplier_bp']+5000)//10000
    child_base=(base*policy['child_multiplier_bp']+5000)//10000
    common=observation['tax_paise']+observation['fee_paise']+policy['surcharge_paise']
    adult=adult_base+common;child=child_base+common;infant=policy['infant_fee_paise']
    return {'total_paise':adults*adult+children*child+infants*infant,
            'adult_unit_paise':adult,'child_unit_paise':child,'infant_unit_paise':infant,
            'seats_required':adults+children,'currency':'INR','synthetic':True,
            'pricing_method':'Scenario cabin multiplier on base fare; inherited illustrative taxes and fees',
            'checked_bag_kg_per_seated_passenger':policy['checked_bag_kg']}

def connection(first, second, rule, first_quote, second_quote, max_minutes=720):
    if not first_quote or not second_quote:return None
    if first['destination'] != second['origin'] or first['destination'] != rule['airport']:return None
    if first['origin'] == second['destination']:return None
    if first['search_day'] != second['search_day']:return None
    if first_quote['seats_required'] != second_quote['seats_required']:return None
    wait=second['departure_utc_minute']-first['arrival_utc_minute']
    duration=second['arrival_utc_minute']-first['departure_utc_minute']
    if not rule['minimum_minutes'] <= wait <= rule['maximum_minutes'] or not 0<duration<=max_minutes:return None
    return {'total_paise':first_quote['total_paise']+second_quote['total_paise'],
            'layover_minutes':wait,'duration_minutes':duration,'self_transfer':True,
            'protected':False,'checked_bag_kg':min(first_quote['checked_bag_kg_per_seated_passenger'],second_quote['checked_bag_kg_per_seated_passenger']),
            'notice':'Separate tickets; baggage collection and check-in may be required. Transfer is not protected.'}
