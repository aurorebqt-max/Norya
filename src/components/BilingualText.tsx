import {View,useWindowDimensions} from 'react-native';
import {Txt} from './ui';
import type {Bilingual} from '../data/romanianLessons';
import type {Language} from '../domain/learning/types';
export function BilingualText({text,language,bold=false}:{text:Bilingual;language:Language;bold?:boolean}){
 const {width}=useWindowDimensions();
 if(language!=='Bilingue')return <Txt bold={bold}>{(language==='RO'?text.ro:text.fr)||'Traduction non disponible'}</Txt>;
 return <View style={{flexDirection:width>900?'row':'column',gap:16}}><View style={{flex:1}}><Txt size={11}>RO</Txt><Txt bold={bold}>{text.ro||'Text indisponibil'}</Txt></View><View style={{flex:1}}><Txt size={11}>FR</Txt><Txt bold={bold}>{text.fr||'Traduction non disponible'}</Txt></View></View>;
}
