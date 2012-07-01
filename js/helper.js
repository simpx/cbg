function found(equip){
    return is_xiaoguang(equip) || is_daguang(equip);
}
function clear_tbody(){
    tbody = $$('#soldList>tbody')[0];
    if(tbody){
        tbody.empty();
        tbody.set('html', '<tr><th width="70">图片</th><th>名称</th>'+
                        '<th width="60">等级</th><th width="110">价格</th>'+
                        '<th width="70">购买要求</th> '+
                        '<th width="120">出售剩余时间</th> <th width="70"></th></tr>');
        $$('.pages')[0].empty();
    }
}
function login(value){
    var action = 'http://xyq.cbg.163.com/cgi-bin/login.py';
    var next_url = '/cgi-bin/equipquery.py?act=query&server_id=527&areaid=3&page=1&kind_id=2&query_order=price+DESC&server_name=%C9%FA%C8%D5%BF%EC%C0%D6&kind_depth=2';
    var args = 'act=do_anon_auth&server_id=252&server_name=扬美古镇&image_value=' + value;
    var request = new Request.HTML({
        url: action,
        evalScripts: false,
        onSuccess: function(responseTree, responseElements, responseHTML){
            console.log(responseHTML);
        }
    }).post(args);
}
function load_els(page_num, found){
    var container = $$('#soldList>tbody')[0];
    var query_url = 'http://xyq.cbg.163.com/cgi-bin/equipquery.py';
    var args = 'act=query&kind_id=2&query_order=price+DESC&server_id='+ServerInfo['server_id']+'&page='+page_num;
    request = new Request.HTML({
        url: query_url,
        evalScripts: false,
        onSuccess: function(responseTree, responseElements, responseHTML){
            console.log(responseHTML);
            if(responseHTML.match(/请输入匿名浏览验证码/)){
                return;
            }
            nodes = responseTree[45].getElementById('soldList').getElementsByTagName('tr');
            els = Array.from(nodes).slice(1);
            els.each(function(el, index){
                equip = parse_equip(el);
                if(found(equip)){
                    fix_el(el);
                    el.inject(container);
                }
            });
            set_img_icon();
            reg_tips_event();
        }
    }).get(args);
}
function fix_el(el){
    equip = parse_equip(el);
    price_td = el.getChildren()[3];
    price_td.innerHTML = get_color_price(equip.price);
    textarea_el = el.getElementsByTagName('textarea')[0];
    if(equip.zongshang)
        textarea_el.value += ("#r#B总伤：" + equip.zongshang);
    if(is_xiaoguang(equip))
        textarea_el.value += ("#r#B小光");
    else
        textarea_el.value += ("#r#B大光");
}
function parse_equip(el){
    equip = {};
    children = el.getChildren();

    img_el = children[0].getElementsByTagName('img')[0];
    textarea_el = children[0].getElementsByTagName('textarea')[0];
    name_el = children[1];

    equip.id = img_el.getProperty('data_equipid');
    equip.name = img_el.getProperty('data_equip_name');
    equip.data_equip_type_desc = img_el.getProperty('data_equip_type_desc');
    equip.data_equip_type = img_el.getProperty('data_equip_type');
    equip.kind = type2kind(equip.data_equip_type);
    if([17,18].contains(equip.kind))
        equip.require_gender = equip.data_equip_type_desc.match(/【装备角色】男$/)?'male':'female';
    equip.desc = textarea_el.value.trim();
    equip.level = children[2].innerText;

    price_info = el.getElementsByTagName('a')[0].get('onclick');
    equip.price = Number(price_info.match(/, (.*)\)$/)[1]);

    equip.require_level = children[4].innerText.slice(0,-1);
    equip.remain_time = children[5].innerText;

    if(4<=equip.kind&& equip.kind<=21){
        //通用信息：耐久、失败次数
        equip.naijiu = equip.desc.match(/耐久度 (\d+)/)[1];
        shibai = equip.desc.match(/修理失败 (\d)次/);
        equip.shibai = shibai?shibai[1]:0;

        equip.duanlian = parse_equip_baoshi(equip.desc)[0];
        equip.baoshi = parse_equip_baoshi(equip.desc)[1];
        equip.teji = parse_equip_teji(equip.desc);
        equip.ronglian = parse_equip_ronglian(equip.desc);
        equip.wuxing = parse_equip_wuxing(equip.desc);
        if((4<=equip.kind && equip.kind<=15) || equip.kind==18){
            equip.shuxing = parse_equip_shuxing(equip.desc);
        }
        if(equip.kind==21)
            equip.lingli = equip.desc.match(/^#r[^#]+#r灵力 (\+\d+)/)[1];
        if(4<=equip.kind && equip.kind<=15){
            equip.shanghai = parse_equip_wuqi(equip.desc)[0];
            equip.mingzhong = parse_equip_wuqi(equip.desc)[1];
            equip.zongshang = equip.mingzhong / 3 + equip.shanghai;
            if(equip.shuxing && equip.shuxing.liliang)
                equip.zongshang += 0.7 * equip.shuxing.liliang;
            if(equip.ronglian && equip.ronglian.liliang)
                equip.zongshang += 0.7 * equip.ronglian.liliang;
            equip.zongshang = equip.zongshang.toFixed(2);
        }

    }
    return equip;
}
function parse_equip_baoshi(desc){
    //宝石信息
    baoshi = desc.match(/锻炼等级 (\d+)  镶嵌宝石 ([^#]+)/);
    if(baoshi){
        duanlian = baoshi[1];
        baoshi = baoshi[2].replace(/、/g, '').split(' ');
        return [duanlian, baoshi];
    }
    else
        return [undefined, undefined]
}
function parse_equip_teji(desc){
    //特技
    teji = desc.match(/#c4DBAF4([\u4E00-\u9FA5：]+)/g);
    if(teji){
        teji.shift();
        result = [];
        teji.each(function(item, index){
            result.push(item.substr(8));
        });
        return result;
    }
}
function parse_equip_ronglian(desc){
    //熔炼
    ronglian = desc.match(/#r#Y熔炼效果：#r#Y(.*)$/);
    if(ronglian){
        ronglian = ronglian[1].match(/([\+-]\d+)([\u4E00-\u9FA5]+)/g);
        result = {};
        ronglian.each(function(item, index){
            t = item.match(/([\+-]\d+)([\u4E00-\u9FA5]+)/);
            result[to_pinyin(t[2])] = Number(t[1]);
        });
        return result;
    }
}
function parse_equip_shuxing(desc){
    //获取武器和衣服的附加属性
    shuxing = desc.match(/#r#G#G(.*?)#r/);
    if(shuxing){
        shuxing = shuxing[1].match(/([\u4E00-\u9FA5]+) ([\+-]\d+)/g);
        result = {};
        shuxing.each(function(item, index){
            t = item.split(' ');
            if(['体质','耐力','力量','魔力','敏捷'].contains(t[0]))
                result[to_pinyin(t[0])] = t[1];
        });
        return result;
    }
}
function parse_equip_wuxing(desc){
    wuxing = desc.match(/五行 ([\u4E00-\u9FA5]+)#r/)
    if(wuxing)
        return wuxing[1];
}
function parse_equip_wuqi(desc){
    return [Number(desc.match(/伤害 (\+\d+)/)[1]), Number(desc.match(/命中 (\+\d+)/)[1])];
}
function is_xiaoguang(equip){
    conditions = {};
    conditions.kind = [function(equip){return equip.kind>=4&&equip.kind<=21}];
    conditions.level = [function(equip){return equip.level>=90&&equip.level<=110}];
    conditions.teji = [function(equip){return equip.teji&&equip.teji.contains("无级别限制")}];
    return judge(equip, conditions);
}
function is_daguang(equip){
    if(equip.teji&&equip.teji.contains("无级别限制")&&equip.level>110&&
        equip.kind>=4&&equip.kind<=21)
        return true;
    else
        return false;
}
function judge(equip, conditions){
    /*
     * conditions = {}
     * conditions.kind = [">=4", "<=15]
     * conditions.level = [">=90", "<=110"]
     * conditions.teji = ["无级别限制", "愤怒"]
     * conditions.shuxing = ["zongshang>=550", "shuxing.liliang>=20"]
     */
    for(var property in conditions){
        var all_passed = conditions[property].every(function(condition, index){
            return condition(equip);
        });
        if(!all_passed) return false;
    }
    return true;
}
function gen_func(str){

}
function type2kind(type){
    /*          data_equip_type  kind
    * 枪矛     16**             4
    * 斧钺     14**             5
    * 剑       10**             6
    * 双短剑   21**             7
    * 飘带     19**             8
    * 爪刺     13**             9
    * 扇       15**             10
    * 魔棒     18**             11
    * 鞭       17**             12
    * 环圈     20**             13
    * 刀       11**             14
    * 锤       12**             15
    * 头盔     25**             17
    * 衣甲     26**             18
    * 鞋子     27**             19
    * 腰带     29**             20
    * 饰物     28**             21
    * 召唤兽装备 9***           29
    * 制造指南书 612 宝石 40**  28
    * 魔兽要诀 611              26
    * 召唤兽内丹 41**           42
    */
    switch(Math.floor(type/100)){
        case 16: return 4;
        case 14: return 5;
        case 10: return 6;
        case 21: return 7;
        case 19: return 8;
        case 13: return 9;
        case 15: return 10;
        case 18: return 11;
        case 17: return 12;
        case 20: return 13;
        case 11: return 14;
        case 12: return 15;
        case 25: return 17;
        case 26: return 18;
        case 27: return 19;
        case 29: return 20;
        case 28: return 21;
    }
}
function to_pinyin(str){
    switch(str){
    case '体质':
        return 'tizhi';
    case '耐力':
        return 'naili';
    case '力量':
        return 'liliang';
    case '魔力':
        return 'moli';
    case '敏捷':
        return 'minjie';
    case '魔法':
        return 'mofa';
    case '灵力':
        return 'lingli';
    case '气血':
        return 'qixue';
    case '防御':
        return 'fangyu';
    }
}
clear_tbody();
load_els(1);
