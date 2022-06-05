function dan_lerp(x0, x, k) {
    return (x0 * (k-1) + x) / k;
}

const SCALE = 8;

function load_sprite(path)
{
    return load_sprite_ext(path, 0, 0, 1);
}

function load_sprite_centred(path)
{
    return load_sprite_ext(path, SCALE/2, SCALE/2, 1);
}

function load_sprite_ext(path, x_offset, y_offset, frame_count)
{
    let sprite = new Image(SCALE, SCALE);
    sprite.src = path;
    return {
        spr : sprite,
        x_offset: x_offset,
        y_offset : y_offset,
        size : SCALE,
        frame_count : frame_count,
    };
}

function load_sprite_16(path)
{
    let sprite = new Image(16, 16);
    sprite.src = path;
    return {
        spr : sprite,
        x_offset: 0,
        y_offset : 0,
        size : 16,
        frame_count : 1,
    };
}

function load_sprite_centred_16(path)
{
    let sprite = new Image(16, 16);
    sprite.src = path;
    return {
        spr : sprite,
        x_offset: 8,
        y_offset : 8,
        size : 16,
        frame_count : 1,
    };
}

function load_sprite_centred_32(path, frame_count)
{
    let sprite = new Image(32, 32);
    sprite.src = path;
    return {
        spr : sprite,
        x_offset: 16,
        y_offset : 16,
        size : 32,
        frame_count : frame_count,
    };
}

let sprite_map = {
    "heatmap": load_sprite('/sprites/spr_heat.png'),
    "player": load_sprite_centred('/sprites/spr_frog.png'),
    "projectile": load_sprite_centred('/sprites/spr_snake.png'),
    "mine": load_sprite_centred('/sprites/spr_bird.png'),
    "explosion": load_sprite_centred('/sprites/spr_explosion.png'),
    "orb": load_sprite_centred('/sprites/spr_bubble.png'),
    "chest": load_sprite_centred('/sprites/spr_crown.png'),

    "icon_empty": load_sprite_16('/sprites/spr_icon_empty.png'),
    "icon_gun": load_sprite_16('/sprites/spr_icon_gun.png'),
    //"icon_gun": load_sprite('/sprites/spr_frog.png'),
    "icon_mine": load_sprite_16('/sprites/spr_icon_mine.png'),

    "spr_enemy_big": load_sprite_centred_32('/sprites/spr_enemy.png', 7),
    "spr_enemy_big_gib_1": load_sprite_centred_32('/sprites/gib_1.png', 1),
    "spr_enemy_big_gib_2": load_sprite_centred_32('/sprites/gib_2.png', 1),
    "spr_enemy_big_gib_3": load_sprite_centred('/sprites/gib_3.png', 1),
    "spr_enemy_big_gib_4": load_sprite_centred('/sprites/gib_4.png', 1),

    "spr_enemy_small": load_sprite_ext('/sprites/spr_snake.png', SCALE/2, SCALE/2, 6),
}

let current_sprite = undefined;

export function set_sprite(sprite_name)
{
    current_sprite = sprite_map[sprite_name];
    if (!current_sprite) {
        console.error("Could not find sprite '" + sprite_name + "'");
    }
    current_frame = 0;
    set_flip(false);
}

let current_frame = 0;

export function set_frame(frame) {
    current_frame = frame % current_sprite.frame_count;
}

let flip = false;

export function set_flip(flip_val) {
    flip = flip_val;
}

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d', { alpha: false });

export function draw_sprite_ui(x, y)
{
    if (ctx)
    {
        const size = current_sprite.size;

        ctx.save();
        ctx.translate(x, y);
        if (flip) {
            ctx.scale(-1, 1);
        }
        else {
            ctx.scale(1, 1);
        }

        ctx.translate(-current_sprite.x_offset, -current_sprite.y_offset);

        ctx.drawImage(current_sprite.spr, size*current_frame, 0, size, size, 0, 0, size, size);
        ctx.restore();
    }
}

export function draw_sprite(x, y)
{
    if (ctx)
    {
        let xx = x * SCALE - camera_x;
        let yy = y * SCALE - camera_y;
        const size = current_sprite.size;

        ctx.save();
        ctx.translate(xx, yy);
        if (flip) {
            ctx.scale(-1, 1);
        }
        else {
            ctx.scale(1, 1);
        }

        ctx.translate(-current_sprite.x_offset, -current_sprite.y_offset);

        ctx.drawImage(current_sprite.spr, size*current_frame, 0, size, size, 0, 0, size, size);
        ctx.restore();
    }
}

let camera_x_base = 0;
let camera_y_base = 0;
let camera_x = 0;
let camera_y = 0;
let screenshake = 0;
let whiteout = 0;

const view_width = 160;
const view_height = 160;

export function update_camera(target_centre_x, target_centre_y)
{
    let target_x = target_centre_x * SCALE - view_width / 2;
    let target_y = target_centre_y * SCALE - view_height / 2;

    const k = 25;
    camera_x_base = dan_lerp(camera_x_base, target_x, k);
    camera_y_base = dan_lerp(camera_y_base, target_y, k);


    screenshake = screenshake * 0.85;
    if (screenshake < 0.5) {
        screenshake = 0;
        camera_x = camera_x_base;
        camera_y = camera_y_base;
    }
    else {
        let offset = 4*Math.sqrt(screenshake);
        let theta = Math.random() * 6.282;
        camera_x = camera_x_base + Math.cos(theta) * offset;
        camera_y = camera_y_base + Math.sin(theta) * offset;
        //camera_x = camera_x_base + offset*rand_one_minus_one();
        //camera_y = camera_y_base + offset*rand_one_minus_one();
    }
}

function rand_one_minus_one() {
    if (Math.random() < 0.5) {
        return -1;
    }
    else {
        return 1;
    }
}

export function set_screenshake(mag)
{
    screenshake = Math.max(mag, screenshake);
}

export function set_whiteout(mag)
{
    whiteout = Math.max(mag, whiteout);
}

export function draw_whiteout()
{
    whiteout = whiteout * 0.85;
    if (whiteout > 0.4) {
        ctx.fillStyle = 'white';
        ctx.globalAlpha = whiteout;

        ctx.beginPath();
        ctx.rect(0, 0, view_width, view_height);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

export function draw_rectangle_black(x0, y0, x1, y1) {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.rect(x0, y0, x1, y1);
    ctx.fill();
}

export function draw_rectangle(x0, y0, x1, y1) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.rect(x0, y0, x1, y1);
    ctx.fill();
}

export function draw_text(x, y, text) {
    ctx.fillStyle = 'white';
    ctx.fillText(text, x, y);
}