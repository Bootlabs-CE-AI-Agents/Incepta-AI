"use client";

import { Fragment, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Option {
    id: string;
    name: string;
}

interface LiquidSelectProps {
    options: Option[];
    value?: Option;
    onChange: (value: Option) => void;
    label?: string;
}

export function LiquidSelect({ options, value, onChange, label }: LiquidSelectProps) {
    return (
        <div className="w-full max-w-xs">
            {label && (
                <label className="block text-sm font-medium text-white/80 mb-2">
                    {label}
                </label>
            )}
            <Listbox value={value} onChange={onChange}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white/5 py-2 pl-3 pr-10 text-left shadow-glass border border-white/10 focus:outline-none focus-visible:border-accent-blue focus-visible:ring-2 focus-visible:ring-white/75 sm:text-sm transition-all hover:bg-white/10">
                        <span className="block truncate text-white">
                            {value ? value.name : 'Select an option'}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                    </Listbox.Button>

                    {/* Portal or high z-index dropdown */}
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#1a1b26]/90 backdrop-blur-xl py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-white/10">
                            {options.map((option, optionIdx) => (
                                <Listbox.Option
                                    key={optionIdx}
                                    className={({ active }) =>
                                        cn(
                                            "relative cursor-default select-none py-2 pl-10 pr-4 transition-colors",
                                            active ? "bg-accent-blue/20 text-accent-blue" : "text-white/80"
                                        )
                                    }
                                    value={option}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={cn("block truncate", selected ? "font-medium" : "font-normal")}>
                                                {option.name}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-blue">
                                                    <Check className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
}
