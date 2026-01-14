import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Setting } from "../entities";
import {
  RegistrationSettingsDto,
  EffectSettingsDto,
} from "../dto/admin-settings.dto";

const REGISTRATION_SETTINGS_KEY = "registration";
const EFFECT_SETTINGS_KEY = "effectSettings";

const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettingsDto = {
  nickname: { min: 3, max: 16 },
  password: { min: 6, max: 16 },
};

const DEFAULT_RED_ENVELOPE_SETTINGS = {
  fallSpeed: 0.3, // 0.1 - 3 (much slower for better visual)
  rotationSpeed: 1.0, // 0.1 - 5 (normal rotation)
  windStrength: 0.3, // 0 - 1 (gentle wind)
  sparkleFrequency: 0.02, // 0 - 0.1 (moderate sparkles)
};

const DEFAULT_SNOW_SETTINGS = {
  speed: 1.0, // 0.1 - 3 (moderate falling speed)
  density: 1.0, // 0.5 - 2 (normal density)
  size: 1.0, // 0.5 - 3 (normal size)
  windStrength: 0.2, // 0 - 1 (gentle wind)
};

const DEFAULT_EFFECT_SETTINGS: EffectSettingsDto = {
  enabled: false,
  activeEffects: [],
  intensity: "medium",
  redEnvelopeSettings: DEFAULT_RED_ENVELOPE_SETTINGS,
  snowSettings: DEFAULT_SNOW_SETTINGS,
  excludedPaths: [],
};

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>
  ) {}

  async getRegistrationSettings(): Promise<RegistrationSettingsDto> {
    const existing = await this.settingRepository.findOne({
      where: { key: REGISTRATION_SETTINGS_KEY },
    });

    if (!existing) {
      return DEFAULT_REGISTRATION_SETTINGS;
    }

    return {
      ...DEFAULT_REGISTRATION_SETTINGS,
      ...(existing.value as RegistrationSettingsDto),
    };
  }

  async updateRegistrationSettings(
    payload: RegistrationSettingsDto
  ): Promise<RegistrationSettingsDto> {
    const merged = {
      ...DEFAULT_REGISTRATION_SETTINGS,
      ...payload,
    };

    let record = await this.settingRepository.findOne({
      where: { key: REGISTRATION_SETTINGS_KEY },
    });

    if (!record) {
      record = this.settingRepository.create({
        key: REGISTRATION_SETTINGS_KEY,
        value: merged,
      });
    } else {
      record.value = merged;
    }

    await this.settingRepository.save(record);
    this.logger.log("Registration settings updated");

    return merged;
  }

  async getEffectSettings(): Promise<EffectSettingsDto> {
    const existing = await this.settingRepository.findOne({
      where: { key: EFFECT_SETTINGS_KEY },
    });

    if (!existing) {
      return DEFAULT_EFFECT_SETTINGS;
    }

    const existingValue = existing.value as EffectSettingsDto;

    // Deep merge per-effect settings to ensure all default values are present
    return {
      ...DEFAULT_EFFECT_SETTINGS,
      ...existingValue,
      redEnvelopeSettings: {
        ...DEFAULT_RED_ENVELOPE_SETTINGS,
        ...(existingValue.redEnvelopeSettings || {}),
      },
      snowSettings: {
        ...DEFAULT_SNOW_SETTINGS,
        ...(existingValue.snowSettings || {}),
      },
    };
  }

  async updateEffectSettings(
    payload: EffectSettingsDto
  ): Promise<EffectSettingsDto> {
    // Deep merge per-effect settings to preserve defaults for missing values
    const merged: EffectSettingsDto = {
      ...DEFAULT_EFFECT_SETTINGS,
      ...payload,
      redEnvelopeSettings: {
        ...DEFAULT_RED_ENVELOPE_SETTINGS,
        ...(payload.redEnvelopeSettings || {}),
      },
      snowSettings: {
        ...DEFAULT_SNOW_SETTINGS,
        ...(payload.snowSettings || {}),
      },
    };

    let record = await this.settingRepository.findOne({
      where: { key: EFFECT_SETTINGS_KEY },
    });

    if (!record) {
      record = this.settingRepository.create({
        key: EFFECT_SETTINGS_KEY,
        value: merged,
      });
    } else {
      record.value = merged;
    }

    await this.settingRepository.save(record);
    this.logger.log("Effect settings updated");

    return merged;
  }
}
