//
//  EndView.swift
//  beartracks-scout
//
//  Created by Jayen Agrawal on 1/14/24.
//

import SwiftUI

struct EndView: View {
    enum FrqFocus: CaseIterable {
        case defense, driving, overall
    }
    
    @ObservedObject var controller: ScoutingController
    @State private var defense: String = ""
    @State private var driving: String = ""
    @State private var overall: String = ""
    @FocusState private var frqFocusField: FrqFocus?

    
    init(controller: ScoutingController) {
        self.controller = controller
        self.defense = controller.getDefenseResponse()
        self.driving = controller.getDrivingResponse()
        self.overall = controller.getOverallResponse()
    }
    
    var body: some View {
        VStack {
            Text("match \(controller.getMatchNumber()) • team \(controller.getTeamNumber())")
                .padding(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("Match Scouting")
                .font(.largeTitle)
                .padding([.leading, .bottom])
                .frame(maxWidth: .infinity, alignment: .leading)
            ScrollView {
                VStack {
                    VStack {
                        Text("Did the robot play defense? If so, explain- was it effective? Did it incur foul points?")
                            .padding([.leading, .top])
                            .frame(maxWidth: .infinity, alignment: .leading)

                            TextEditor(text: $defense)
                                .focused($frqFocusField, equals: .defense)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.gray, lineWidth: 1)
                                )
                                .frame(height: 150)
                                .padding([.leading, .trailing])
                    }
                    
                    VStack {
                        Text("How was the driving? Did the driver seem confident?")
                            .padding([.leading, .top])
                            .frame(maxWidth: .infinity, alignment: .leading)

                        TextEditor(text: $driving)
                            .focused($frqFocusField, equals: .driving)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.gray, lineWidth: 1)
                            )
                            .frame(height: 150)
                            .padding([.leading, .trailing])
                    }
                    
                    VStack {
                        Text("Provide an overall description of the team's performance in this match")
                            .padding([.leading, .top])
                            .frame(maxWidth: .infinity, alignment: .leading)

                        TextEditor(text: $overall)
                            .focused($frqFocusField, equals: .overall)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.gray, lineWidth: 1)
                            )
                            .frame(height: 150)
                            .padding([.leading, .trailing])
                    }
                }
                .padding(.bottom)
                Button("review") {
                    controller.setDefenseResponse(response: defense)
                    controller.setDrivingResponse(response: driving)
                    controller.setOverallResponse(response: overall)
                    controller.advanceToTab(tab: .review)
                }
                .padding()
                .buttonStyle(.bordered)
            }
            Spacer()
        }
    }
}

#Preview {
    EndView(controller: ScoutingController())
}