const SCREEN_MARGIN: i32 = 80;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl ScreenRect {
    fn max_x(self, window_width: i32) -> i32 {
        self.x + self.width - window_width
    }

    fn max_y(self, window_height: i32) -> i32 {
        self.y + self.height - window_height
    }

    fn contains_with_margin(self, x: i32, y: i32, window_width: i32, window_height: i32) -> bool {
        x >= self.x - SCREEN_MARGIN
            && y >= self.y - SCREEN_MARGIN
            && x <= self.max_x(window_width) + SCREEN_MARGIN
            && y <= self.max_y(window_height) + SCREEN_MARGIN
    }
}

pub fn normalize_position_for_screens(
    x: i32,
    y: i32,
    window_width: i32,
    window_height: i32,
    screens: &[ScreenRect],
) -> (i32, i32) {
    let primary = screens.first().copied().unwrap_or(ScreenRect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    });

    if screens
        .iter()
        .any(|screen| screen.contains_with_margin(x, y, window_width, window_height))
    {
        return (x, y);
    }

    (
        (primary.x + primary.width - window_width - SCREEN_MARGIN).max(primary.x),
        (primary.y + primary.height - window_height - SCREEN_MARGIN).max(primary.y),
    )
}

pub fn screens_with_primary_first(
    primary: Option<ScreenRect>,
    screens: &[ScreenRect],
) -> Vec<ScreenRect> {
    let Some(primary) = primary else {
        return screens.to_vec();
    };

    let mut ordered = Vec::with_capacity(screens.len().max(1));
    ordered.push(primary);
    ordered.extend(screens.iter().copied().filter(|screen| *screen != primary));
    ordered
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_position_visible_on_secondary_monitor() {
        let screens = [
            ScreenRect {
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
            },
            ScreenRect {
                x: 1920,
                y: 0,
                width: 1920,
                height: 1080,
            },
        ];

        let position = normalize_position_for_screens(2200, 200, 160, 160, &screens);

        assert_eq!(position, (2200, 200));
    }

    #[test]
    fn keeps_position_visible_on_left_monitor_with_negative_x() {
        let screens = [
            ScreenRect {
                x: -1920,
                y: 0,
                width: 1920,
                height: 1080,
            },
            ScreenRect {
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
            },
        ];

        let position = normalize_position_for_screens(-900, 300, 160, 160, &screens);

        assert_eq!(position, (-900, 300));
    }

    #[test]
    fn moves_fully_offscreen_position_to_primary_bottom_right() {
        let screens = [ScreenRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        }];

        let position = normalize_position_for_screens(9000, 9000, 160, 160, &screens);

        assert_eq!(position, (1680, 840));
    }

    #[test]
    fn orders_primary_screen_first_when_available_monitors_lists_secondary_first() {
        let primary = ScreenRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let secondary = ScreenRect {
            x: 1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let available_screens = [secondary, primary];

        let screens = screens_with_primary_first(Some(primary), &available_screens);
        let position = normalize_position_for_screens(9000, 9000, 160, 160, &screens);

        assert_eq!(position, (1680, 840));
    }
}
