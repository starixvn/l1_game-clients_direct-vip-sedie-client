const win = window as any;
export const languages = {
    "Common": {},
    "VipSeDie": {
        "bet_option_red2": "2 红",
        "bet_option_red3": "3 红",
        "bet_option_red4": "4 红",
        "bet_option_white3": "1 红",
        "bet_option_white4": "4 白",
        "even_win": "双赢",
        "game_icon_name": "VIP 色碟",
        "game_name": "VIP 色碟",
        "glossary_even": "双",
        "glossary_odd": "单",
        "odd_win": "单赢"
    }
};

if (!win.languages) {
    win.languages = {};
}

win.languages.zh_cn = languages;